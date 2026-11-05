using System.Data;
using System.Text.Json;
using Microsoft.Data.SqlClient;

const string cs = "Server=localhost;Database=DeepSprout_Validation;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;Application Name=DeepSprout M1 Validation";
if (args.Contains("--lab", StringComparer.OrdinalIgnoreCase))
{
    var lab = new LabValidation(cs);
    await lab.Execute();
    Environment.ExitCode = lab.Failures == 0 ? 0 : 1;
    return;
}
if (args.Contains("--shield", StringComparer.OrdinalIgnoreCase))
{
    var shield = new ShieldValidation(cs);
    await shield.Execute();
    Environment.ExitCode = shield.Failures == 0 ? 0 : 1;
    return;
}
if (args.Contains("--operations", StringComparer.OrdinalIgnoreCase))
{
    var operations = new OperationsValidation(cs);
    await operations.Execute();
    Environment.ExitCode = operations.Failures == 0 ? 0 : 1;
    return;
}
if (args.Contains("--coach", StringComparer.OrdinalIgnoreCase))
{
    var coach = new CoachFoundationValidation(cs);
    await coach.Execute();
    Environment.ExitCode = coach.Failures == 0 ? 0 : 1;
    return;
}
if (args.Contains("--evidence", StringComparer.OrdinalIgnoreCase))
{
    var evidence = new EvidenceValidation(cs);
    await evidence.Execute();
    Environment.ExitCode = evidence.Failures == 0 ? 0 : 1;
    return;
}
if (args.Contains("--recovery", StringComparer.OrdinalIgnoreCase))
{
    var recovery = new RecoveryActivityValidation(cs);
    await recovery.Execute();
    Environment.ExitCode = recovery.Failures == 0 ? 0 : 1;
    return;
}
if (args.Contains("--coach-participation", StringComparer.OrdinalIgnoreCase))
{
    var participation = new CoachParticipationValidation(cs);
    await participation.Execute();
    Environment.ExitCode = participation.Failures == 0 ? 0 : 1;
    return;
}
if (args.Contains("--task", StringComparer.OrdinalIgnoreCase))
{
    var task = new TaskValidation(cs);
    await task.Execute();
    Environment.ExitCode = task.Failures == 0 ? 0 : 1;
    return;
}
if (args.Contains("--community", StringComparer.OrdinalIgnoreCase))
{
    var community = new CommunityValidation(cs);
    await community.Execute();
    Environment.ExitCode = community.Failures == 0 ? 0 : 1;
    return;
}
if (args.Contains("--session", StringComparer.OrdinalIgnoreCase))
{
    var session = new SessionValidation(cs);
    await session.Execute();
    Environment.ExitCode = session.Failures == 0 ? 0 : 1;
    return;
}
if (args.Contains("--provider-foundation", StringComparer.OrdinalIgnoreCase))
{
    var provider = new ProviderFoundationValidation(cs);
    await provider.Execute();
    Environment.ExitCode = provider.Failures == 0 ? 0 : 1;
    return;
}
if (args.Contains("--provider-operations", StringComparer.OrdinalIgnoreCase))
{
    var provider = new ProviderOperationsValidation(cs);
    await provider.Execute();
    Environment.ExitCode = provider.Failures == 0 ? 0 : 1;
    return;
}
if (args.Contains("--institution-extensions", StringComparer.OrdinalIgnoreCase))
{
    var extensions = new InstitutionExtensionsValidation(cs);
    await extensions.Execute();
    Environment.ExitCode = extensions.Failures == 0 ? 0 : 1;
    return;
}
if (args.Contains("--partnership", StringComparer.OrdinalIgnoreCase))
{
    var partnership = new PartnershipValidation(cs);
    await partnership.Execute();
    Environment.ExitCode = partnership.Failures == 0 ? 0 : 1;
    return;
}
if (args.Contains("--commercial", StringComparer.OrdinalIgnoreCase))
{
    var commercial = new CommercialValidation(cs);
    await commercial.Execute();
    Environment.ExitCode = commercial.Failures == 0 ? 0 : 1;
    return;
}
if (args.Contains("--forms", StringComparer.OrdinalIgnoreCase))
{
    var forms = new FormValidation(cs);
    await forms.Execute();
    Environment.ExitCode = forms.Failures == 0 ? 0 : 1;
    return;
}
var t = new Validation(cs);
await t.Execute();
Environment.ExitCode = t.Failures == 0 ? 0 : 1;

internal sealed class Validation(string connectionString)
{
    private readonly string tag = "m1-" + Guid.NewGuid().ToString("N")[..10];
    private int seq;
    private long actor, institution, initiative, revision;
    public int Failures { get; private set; }

    public async Task Execute()
    {
        using var db = Open();
        var server = S<string>(db, "SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var name = S<string>(db, "SELECT DB_NAME()");
        if (server != "DESKTOP-A4AL2KR" || name != "DeepSprout_Validation") throw new Exception($"Wrong server/database: {server}/{name}");
        Log("ENV-01", "PASS", $"{server}/{name}; version={S<string>(db, "SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ProductVersion'))")}; SPID={S<int>(db, "SELECT @@SPID")}");

        actor = Person(db, "representative"); institution = Institution(db, actor);
        var (root, draft) = Draft(db, institution, actor); initiative = root;
        Check("BLD-01", S<int>(db, "SELECT COUNT(*) FROM institution.Initiative WHERE Id=@id AND Status=N'Draft' AND Title IS NULL", ("@id", root)) == 1, "titleless stage-one draft saved");
        var stale = Version(db, draft); Save(db, draft, actor, 1, stale);
        Expect("BLD-02", 51105, () => Save(db, draft, actor, 2, stale));
        Expect("BLD-03", 51107, () => Publish(db, draft, actor, 2, DateTime.UtcNow.AddHours(200)));
        for (byte stage = 2; stage <= 6; stage++) Save(db, draft, actor, stage, Version(db, draft));
        revision = Publish(db, draft, actor, 2, DateTime.UtcNow.AddHours(200));
        Check("BLD-04", S<int>(db, "SELECT COUNT(*) FROM institution.Initiative i JOIN institution.InitiativeRevision r ON r.InitiativeId=i.Id JOIN institution.InitiativeDraft d ON d.PublishedRevisionId=r.Id WHERE i.Id=@id AND i.Status=N'Published' AND d.Status=N'Published'", ("@id", root)) == 1 &&
            S<int>(db, "SELECT COUNT(*) FROM ops.AuditEvent WHERE ResourceKind=N'Initiative' AND Action=N'Published' AND ResourcePublicId=(SELECT PublicId FROM institution.Initiative WHERE Id=@id)", ("@id", root)) == 1,
            $"root/revision/draft/audit committed; revision={revision}");
        Expect("BLD-05", 51041, () => N(db, "UPDATE institution.InitiativeRevision SET Summary=N'tamper' WHERE Id=@id", ("@id", revision)));
        Expect("SQL-CK-01", 547, () => N(db, "UPDATE institution.Initiative SET Capacity=136 WHERE Id=@id", ("@id", root)), "CK_Initiative_Capacity");
        Expect("SQL-CK-02", 547, () => N(db, "UPDATE institution.InitiativeDraft SET Stage1Json=N'not-json' WHERE Id=@id", ("@id", draft)), "CK_InitiativeDraft_Json1");

        var personA = Person(db, "FK applicant"); var personB = Person(db, "FK mismatch");
        var app = Submit(db, root, personA);
        var secondRevision = Reschedule(db, root, actor, DateTime.UtcNow.AddHours(190));
        Expect("SQL-04", 547, () => N(db, "INSERT institution.InitiativeApplicationDecision(ApplicationId,InitiativeId,DecisionNo,Action,ActorPersonId,TermsRevisionId,AtUtc) VALUES(@a,@i,1,N'Rejected',@p,@r,SYSUTCDATETIME())", ("@a", app), ("@i", root), ("@p", actor), ("@r", secondRevision)), "FK_InitiativeApplicationDecision_InitiativeApplication_ApplicationId_InitiativeId_TermsRevisionId");
        Expect("SQL-03", 547, () => N(db, "INSERT institution.InitiativeMembership(InitiativeId,ApplicationId,PersonId,Status,AcceptedAtUtc,WithdrawalCutoffAtUtc) VALUES(@i,@a,@p,N'Accepted',SYSUTCDATETIME(),DATEADD(hour,80,SYSUTCDATETIME()))", ("@i", root), ("@a", app), ("@p", personB)), "FK_InitiativeMembership_InitiativeApplication_ApplicationId_InitiativeId_PersonId");
        var noRevision = S<long>(db, "INSERT institution.Initiative(InstitutionId,Status) VALUES(@i,N'Draft'); SELECT CAST(SCOPE_IDENTITY() AS bigint);", ("@i", institution));
        Expect("BLD-03-GUARD", 51040, () => N(db, "UPDATE institution.Initiative SET Status=N'Published',Title=N'Bypass',Mode=N'Online',Capacity=1,TimeZoneId=N'Asia/Amman',StartsAtUtc=DATEADD(hour,200,SYSUTCDATETIME()),EndsAtUtc=DATEADD(hour,202,SYSUTCDATETIME()),WithdrawalCutoffAtUtc=DATEADD(hour,80,SYSUTCDATETIME()) WHERE Id=@id", ("@id", noRevision)));
        Reject(db, app, actor, false);
        Expect("HIST-01", 51042, () => N(db, "UPDATE institution.InitiativeApplicationDecision SET Action=N'Approved' WHERE ApplicationId=@id", ("@id", app)));

        var p = Person(db, "pending withdraw"); app = Submit(db, root, p); P(db, "institution.WithdrawApplication", ("@ApplicationId", app), ("@ActorPersonId", p));
        Check("APP-01", S<string>(db, "SELECT Status FROM institution.InitiativeApplication WHERE Id=@id", ("@id", app)) == "Withdrawn" && S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeMembership WHERE ApplicationId=@id", ("@id", app)) == 0, "pending withdrawal without membership");
        p = Person(db, "rejected retry"); app = Submit(db, root, p); Reject(db, app, actor, false); var retry = Submit(db, root, p);
        Check("APP-02", retry != app && S<int>(db, "SELECT AttemptNo FROM institution.InitiativeApplication WHERE Id=@id", ("@id", retry)) == 2, $"attempts={app},{retry}; AttemptNo=2");
        p = Person(db, "blocked retry"); app = Submit(db, root, p); Reject(db, app, actor, true);
        Expect("APP-03", 51204, () => Submit(db, root, p));
        p = Person(db, "duplicate pending"); app = Submit(db, root, p);
        Expect("APP-04", 51205, () => Submit(db, root, p));
        var outsider = Person(db, "outsider");
        Expect("APP-05", 51209, () => Approve(db, app, outsider));
        Check("APP-05-STATE", S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeMembership WHERE ApplicationId=@id", ("@id", app)) == 0 &&
            S<int>(db, "SELECT COUNT(*) FROM ops.AuditEvent WHERE Action=N'AdmissionDenied' AND ActorPersonId=@actor AND ResourcePublicId=(SELECT PublicId FROM institution.InitiativeApplication WHERE Id=@id)", ("@actor", outsider), ("@id", app)) == 1,
            "no unauthorized membership; one denial audit");
        var membership = Approve(db, app, actor);
        Check("APP-06", membership == Approve(db, app, actor) && S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeApplicationDecision WHERE ApplicationId=@id AND Action=N'Approved'", ("@id", app)) == 1, "retry returned one membership and one decision");
        Expect("SQL-CK-03", 547, () => N(db, "UPDATE institution.InitiativeMembership SET CapacityReleasedAtUtc=SYSUTCDATETIME() WHERE Id=@id", ("@id", membership)), "CK_InitiativeMembership_EndRelease");

        p = Person(db, "withdraw before"); var (i1, _) = Published(db, institution, actor, 1, DateTime.UtcNow.AddHours(200));
        membership = Approve(db, Submit(db, i1, p), actor);
        P(db, "institution.EndMembership", ("@MembershipId", membership), ("@ActorPersonId", p), ("@NewStatus", "Withdrawn"));
        Check("MEM-02", S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeMembership WHERE Id=@id AND Status=N'Withdrawn' AND EndedAtUtc IS NOT NULL AND CapacityReleasedAtUtc IS NOT NULL", ("@id", membership)) == 1, "withdrawal released capacity before cutoff");
        Check("MEM-03-FUNCTION", S<int>(db, "DECLARE @t datetime2(3)=SYSUTCDATETIME(); SELECT CONVERT(int,institution.CanWithdraw(@t,@t))") == 0, "exact boundary rejected by SQL function");
        p = Person(db, "withdraw after"); var (i2, _) = Published(db, institution, actor, 1, DateTime.UtcNow.AddHours(100));
        membership = Approve(db, Submit(db, i2, p), actor);
        Expect("MEM-04", 51303, () => P(db, "institution.EndMembership", ("@MembershipId", membership), ("@ActorPersonId", p), ("@NewStatus", "Withdrawn")));
        p = Person(db, "suspended"); var (i3, _) = Published(db, institution, actor, 1, DateTime.UtcNow.AddHours(200));
        membership = Approve(db, Submit(db, i3, p), actor);
        P(db, "institution.SetMembershipSuspension", ("@MembershipId", membership), ("@ActorPersonId", actor), ("@Suspend", true));
        var next = Submit(db, i3, Person(db, "seat after suspension"));
        Expect("MEM-05", 51212, () => Approve(db, next, actor));
        Expect("MEM-05-AUTH", 51102, () => P(db, "institution.SetMembershipSuspension", ("@MembershipId", membership), ("@ActorPersonId", outsider), ("@Suspend", false)));
        P(db, "institution.SetMembershipSuspension", ("@MembershipId", membership), ("@ActorPersonId", actor), ("@Suspend", false));
        Check("MEM-05-RESTORE", S<string>(db, "SELECT Status FROM institution.InitiativeMembership WHERE Id=@id", ("@id", membership)) == "Accepted", "active representative restored suspended membership");
        P(db, "institution.EndMembership", ("@MembershipId", membership), ("@ActorPersonId", actor), ("@NewStatus", "Removed"));
        Check("MEM-06-REMOVED", S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeMembership WHERE Id=@id AND CapacityReleasedAtUtc IS NOT NULL", ("@id", membership)) == 1, "removed immediately releases capacity");
        membership = Approve(db, next, actor);
        P(db, "institution.EndMembership", ("@MembershipId", membership), ("@ActorPersonId", actor), ("@NewStatus", "Completed"));
        Check("MEM-06-COMPLETED", S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeMembership WHERE Id=@id AND CapacityReleasedAtUtc IS NOT NULL", ("@id", membership)) == 1, "completed immediately releases capacity");
        p = Person(db, "rescheduled withdrawal"); var (i4, _) = Published(db, institution, actor, 1, DateTime.UtcNow.AddHours(200));
        membership = Approve(db, Submit(db, i4, p), actor);
        var pinned = S<DateTime>(db, "SELECT WithdrawalCutoffAtUtc FROM institution.InitiativeMembership WHERE Id=@id", ("@id", membership));
        Reschedule(db, i4, actor, DateTime.UtcNow.AddHours(50));
        var newCutoff = S<DateTime>(db, "SELECT WithdrawalCutoffAtUtc FROM institution.Initiative WHERE Id=@id", ("@id", i4));
        P(db, "institution.EndMembership", ("@MembershipId", membership), ("@ActorPersonId", p), ("@NewStatus", "Withdrawn"));
        Check("MEM-07", pinned > DateTime.UtcNow && newCutoff < DateTime.UtcNow && pinned == S<DateTime>(db, "SELECT WithdrawalCutoffAtUtc FROM institution.InitiativeMembership WHERE Id=@id", ("@id", membership)), "earlier start did not remove existing withdrawal right");

        RunPhaseA(db, outsider);

        var (staffInitiative, _) = Published(db, institution, actor, 5, DateTime.UtcNow.AddHours(200));
        var staff = Enumerable.Range(0, 4).Select(x => Person(db, $"supervisor {x}")).ToArray();
        var invites = staff.Select(x => Invite(db, staffInitiative, actor, x)).ToArray();
        Expect("SUP-03", 51033, () => AcceptInvite(db, invites[0], outsider));
        var appointments = staff.Take(3).Select((x, n) => AcceptInvite(db, invites[n], x)).ToArray();
        Check("SUP-01", S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeStaffAppointment WHERE InitiativeId=@id AND Role=N'Supervisor' AND Status=N'Active'", ("@id", staffInitiative)) == 3, "third supervisor accepted");
        Expect("SUP-02", 51034, () => AcceptInvite(db, invites[3], staff[3]));
        P(db, "institution.RevokeStaffAppointment", ("@AppointmentId", appointments[0]), ("@ActorPersonId", actor));
        app = Submit(db, staffInitiative, Person(db, "supervisor approval applicant"));
        Expect("SUP-04", 51209, () => Approve(db, app, staff[0]));

        var file = S<long>(db, "INSERT files.SecureFile(OwnerPersonId,Purpose,ObjectKey,MimeType,Bytes,Sha256,Status) OUTPUT INSERTED.Id VALUES(@p,N'InstitutionProof',@key,N'application/pdf',10,HASHBYTES('SHA2_256',N'test'),N'Available')", ("@p", actor), ("@key", tag + "/proof"));
        Expect("SEC-01-DB", 51501, () => P(db, "files.ReadSecureFileMetadata", ("@FileId", file), ("@ActorPersonId", outsider)));
        N(db, "IF USER_ID(N'deepsprout_runtime_test') IS NULL CREATE USER deepsprout_runtime_test WITHOUT LOGIN; IF NOT EXISTS (SELECT 1 FROM sys.database_role_members rm JOIN sys.database_principals r ON r.principal_id=rm.role_principal_id JOIN sys.database_principals u ON u.principal_id=rm.member_principal_id WHERE r.name=N'deepsprout_runtime' AND u.name=N'deepsprout_runtime_test') ALTER ROLE deepsprout_runtime ADD MEMBER deepsprout_runtime_test;");
        var runtimeError = S<int>(db, "EXECUTE AS USER=N'deepsprout_runtime_test'; DECLARE @n int=0; BEGIN TRY UPDATE institution.InitiativeRevision SET Summary=N'bypass' WHERE Id=@id; END TRY BEGIN CATCH SET @n=ERROR_NUMBER(); END CATCH; REVERT; SELECT @n;", ("@id", revision));
        Check("BLD-05-RUNTIME", runtimeError is 229 or 230, $"direct UPDATE denied with SQL {runtimeError}");

        var (large, _) = Published(db, institution, actor, 135, DateTime.UtcNow.AddHours(200));
        for (var n = 0; n < 135; n++) Approve(db, Submit(db, large, Person(db, $"seat {n}")), actor);
        Check("CAP-01", S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeMembership WHERE InitiativeId=@id AND CapacityReleasedAtUtc IS NULL", ("@id", large)) == 135, "135th acceptance occupied the last seat");
        app = Submit(db, large, Person(db, "seat 136"));
        Expect("CAP-02", 51212, () => Approve(db, app, actor));

        var (raceInitiative, _) = Published(db, institution, actor, 1, DateTime.UtcNow.AddHours(200));
        var raceA = Submit(db, raceInitiative, Person(db, "race seat A"));
        var raceB = Submit(db, raceInitiative, Person(db, "race seat B"));
        var outcomes = await Race(raceA, raceB);
        var occupied = S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeMembership WHERE InitiativeId=@id AND CapacityReleasedAtUtc IS NULL", ("@id", raceInitiative));
        var approved = S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeApplicationDecision WHERE InitiativeId=@id AND Action=N'Approved'", ("@id", raceInitiative));
        var audits = S<int>(db, "SELECT COUNT(*) FROM ops.AuditEvent WHERE Action=N'Approved' AND ResourcePublicId IN (SELECT PublicId FROM institution.InitiativeApplication WHERE InitiativeId=@id)", ("@id", raceInitiative));
        Check("CAP-03", outcomes.Count(x => x.error == 0) == 1 && outcomes.Count(x => x.error == 51212) == 1 && occupied == 1 && approved == 1 && audits == 1,
            $"SPIDs={string.Join(',', outcomes.Select(x => x.spid))}; errors={string.Join(',', outcomes.Select(x => x.error))}; occupied={occupied}; decisions={approved}; audits={audits}");
        var racePerson = Person(db, "race one person");
        var (raceI1, _) = Published(db, institution, actor, 1, DateTime.UtcNow.AddHours(200));
        var (raceI2, _) = Published(db, institution, actor, 1, DateTime.UtcNow.AddHours(200));
        var raceApp1 = Submit(db, raceI1, racePerson); var raceApp2 = Submit(db, raceI2, racePerson);
        outcomes = await Race(raceApp1, raceApp2);
        var active = S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeMembership WHERE PersonId=@p AND Status IN (N'Accepted',N'Suspended')", ("@p", racePerson));
        var personDecisions = S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeApplicationDecision d JOIN institution.InitiativeApplication a ON a.Id=d.ApplicationId WHERE a.PersonId=@p AND d.Action=N'Approved'", ("@p", racePerson));
        var personAudits = S<int>(db, "SELECT COUNT(*) FROM ops.AuditEvent WHERE Action=N'Approved' AND ResourcePublicId IN (SELECT PublicId FROM institution.InitiativeApplication WHERE PersonId=@p)", ("@p", racePerson));
        Check("MEM-01", outcomes.Count(x => x.error == 0) == 1 && outcomes.Count(x => x.error is 51211 or 2601 or 2627) == 1 && active == 1 && personDecisions == 1 && personAudits == 1,
            $"SPIDs={string.Join(',', outcomes.Select(x => x.spid))}; errors={string.Join(',', outcomes.Select(x => x.error))}; active={active}; decisions={personDecisions}; audits={personAudits}");
        var lostApp = S<long>(db, "SELECT TOP (1) Id FROM institution.InitiativeApplication WHERE PersonId=@p AND Status=N'Pending' AND InitiativeId IN (@i1,@i2)",
            ("@p", racePerson), ("@i1", raceI1), ("@i2", raceI2));
        var lostInitiative = S<long>(db, "SELECT InitiativeId FROM institution.InitiativeApplication WHERE Id=@id", ("@id", lostApp));
        Expect("SQL-05", 2601, () => N(db,
            "INSERT institution.InitiativeMembership(InitiativeId,ApplicationId,PersonId,Status,AcceptedAtUtc,WithdrawalCutoffAtUtc) VALUES(@i,@a,@p,N'Accepted',SYSUTCDATETIME(),DATEADD(hour,80,SYSUTCDATETIME()))",
            ("@i", lostInitiative), ("@a", lostApp), ("@p", racePerson)), "IX_InitiativeMembership_PersonId");

        Log("SUMMARY", Failures == 0 ? "PASS" : "FAIL", $"failures={Failures}; fixtureTag={tag}");
    }

    private async Task<(int spid, int error)[]> Race(long a, long b)
    {
        using var gate = new Barrier(2);
        async Task<(int spid, int error)> Call(long app)
        {
            using var c = new SqlConnection(connectionString); await c.OpenAsync();
            var spid = S<int>(c, "SELECT @@SPID");
            if (!gate.SignalAndWait(TimeSpan.FromSeconds(15))) throw new TimeoutException("Race barrier timed out");
            try { Approve(c, app, actor); return (spid, 0); }
            catch (SqlException e) { return (spid, e.Number); }
        }
        return await Task.WhenAll(Task.Run(() => Call(a)), Task.Run(() => Call(b)));
    }

    private void RunPhaseA(SqlConnection db, long outsider)
    {
        foreach (var offset in new[] { -1, 0, 1 })
        {
            var memberPerson = Person(db, $"cutoff {offset}");
            var (root, _) = Published(db, institution, actor, 1, DateTime.UtcNow.AddHours(200));
            var membership = Approve(db, Submit(db, root, memberPerson), actor);
            var cutoff = S<DateTime>(db, "SELECT WithdrawalCutoffAtUtc FROM institution.InitiativeMembership WHERE Id=@id", ("@id", membership));
            var auditBefore = S<int>(db, "SELECT COUNT(*) FROM ops.AuditEvent WHERE ResourceKind=N'Membership' AND ResourcePublicId=(SELECT PublicId FROM institution.InitiativeMembership WHERE Id=@id)", ("@id", membership));
            void Withdraw() => P(db, "ops.EndMembershipAt", ("@MembershipId", membership), ("@ActorPersonId", memberPerson),
                ("@NewStatus", "Withdrawn"), ("@NowUtc", cutoff.AddMilliseconds(offset)));
            if (offset < 0) Withdraw();
            else Expect($"MEM-03-{offset}-ERROR", 51303, Withdraw);
            var status = S<string>(db, "SELECT Status FROM institution.InitiativeMembership WHERE Id=@id", ("@id", membership));
            var occupied = S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeMembership WHERE InitiativeId=@id AND CapacityReleasedAtUtc IS NULL", ("@id", root));
            var auditAfter = S<int>(db, "SELECT COUNT(*) FROM ops.AuditEvent WHERE ResourceKind=N'Membership' AND ResourcePublicId=(SELECT PublicId FROM institution.InitiativeMembership WHERE Id=@id)", ("@id", membership));
            Check($"MEM-03-{offset}-STATE", status == (offset < 0 ? "Withdrawn" : "Accepted") &&
                occupied == (offset < 0 ? 0 : 1) && auditAfter - auditBefore == (offset < 0 ? 1 : 0),
                $"now=cutoff{offset:+#;-#;0}ms; status={status}; occupied={occupied}; auditDelta={auditAfter - auditBefore}");
        }

        var laterPerson = Person(db, "postponed member");
        var (laterRoot, laterRevision) = Published(db, institution, actor, 2, DateTime.UtcNow.AddHours(200));
        var laterMember = Approve(db, Submit(db, laterRoot, laterPerson), actor);
        var oldCutoff = S<DateTime>(db, "SELECT WithdrawalCutoffAtUtc FROM institution.InitiativeMembership WHERE Id=@id", ("@id", laterMember));
        Reschedule(db, laterRoot, actor, DateTime.UtcNow.AddHours(240));
        var extended = S<DateTime>(db, "SELECT WithdrawalCutoffAtUtc FROM institution.InitiativeMembership WHERE Id=@id", ("@id", laterMember));
        Check("RESCHEDULE-POSTPONE", extended > oldCutoff &&
            extended == S<DateTime>(db, "SELECT WithdrawalCutoffAtUtc FROM institution.Initiative WHERE Id=@id", ("@id", laterRoot)) &&
            oldCutoff == S<DateTime>(db, "SELECT WithdrawalCutoffAtUtc FROM institution.InitiativeRevision WHERE Id=@id", ("@id", laterRevision)),
            $"old={oldCutoff:O}; extended={extended:O}; historical revision retained");
        P(db, "ops.EndMembershipAt", ("@MembershipId", laterMember), ("@ActorPersonId", laterPerson),
            ("@NewStatus", "Withdrawn"), ("@NowUtc", oldCutoff.AddMilliseconds(1)));
        Check("RESCHEDULE-POSTPONE-WITHDRAW", S<string>(db, "SELECT Status FROM institution.InitiativeMembership WHERE Id=@id", ("@id", laterMember)) == "Withdrawn",
            "actual withdrawal command succeeded after old cutoff but before extended cutoff");
        var advancePerson = Person(db, "advanced member");
        var advanceMember = Approve(db, Submit(db, laterRoot, advancePerson), actor);
        var preserved = S<DateTime>(db, "SELECT WithdrawalCutoffAtUtc FROM institution.InitiativeMembership WHERE Id=@id", ("@id", advanceMember));
        Reschedule(db, laterRoot, actor, DateTime.UtcNow.AddHours(170));
        var advancedCutoff = S<DateTime>(db, "SELECT WithdrawalCutoffAtUtc FROM institution.Initiative WHERE Id=@id", ("@id", laterRoot));
        P(db, "ops.EndMembershipAt", ("@MembershipId", advanceMember), ("@ActorPersonId", advancePerson),
            ("@NewStatus", "Withdrawn"), ("@NowUtc", advancedCutoff.AddMilliseconds(1)));
        Check("RESCHEDULE-ADVANCE", advancedCutoff < preserved &&
            S<DateTime>(db, "SELECT WithdrawalCutoffAtUtc FROM institution.InitiativeMembership WHERE Id=@id", ("@id", advanceMember)) == preserved &&
            S<string>(db, "SELECT Status FROM institution.InitiativeMembership WHERE Id=@id", ("@id", advanceMember)) == "Withdrawn",
            $"new={advancedCutoff:O}; preserved={preserved:O}; withdrawal command succeeded after new cutoff");
        Expect("RESCHEDULE-UNSAFE", 51601, () => Reschedule(db, laterRoot, actor, DateTime.UtcNow.AddMinutes(-1)));

        var (cancelRoot, _) = Published(db, institution, actor, 4, DateTime.UtcNow.AddHours(200));
        var pending = Submit(db, cancelRoot, Person(db, "cancel pending"));
        var acceptedApp = Submit(db, cancelRoot, Person(db, "cancel accepted"));
        var acceptedMember = Approve(db, acceptedApp, actor);
        var suspendedApp = Submit(db, cancelRoot, Person(db, "cancel suspended"));
        var suspendedMember = Approve(db, suspendedApp, actor);
        P(db, "institution.SetMembershipSuspension", ("@MembershipId", suspendedMember), ("@ActorPersonId", actor), ("@Suspend", true));
        var completedApp = Submit(db, cancelRoot, Person(db, "cancel completed"));
        var completedMember = Approve(db, completedApp, actor);
        P(db, "institution.EndMembership", ("@MembershipId", completedMember), ("@ActorPersonId", actor), ("@NewStatus", "Completed"));
        Expect("MEM-08-UNAUTHORIZED", 51705, () => Cancel(db, cancelRoot, outsider, "Unauthorized"));
        Check("MEM-08-UNAUTHORIZED-STATE", S<string>(db, "SELECT Status FROM institution.Initiative WHERE Id=@id", ("@id", cancelRoot)) == "Published" &&
            S<string>(db, "SELECT Status FROM institution.InitiativeApplication WHERE Id=@id", ("@id", pending)) == "Pending",
            "denied command left initiative and pending application intact");
        Cancel(db, cancelRoot, actor, "Owner approved cancellation test");
        Check("MEM-08-ROOT", S<int>(db, "SELECT COUNT(*) FROM institution.Initiative WHERE Id=@id AND Status=N'Cancelled' AND CancellationReason=N'Owner approved cancellation test' AND CancelledByPersonId=@actor AND CancelledAtUtc IS NOT NULL", ("@id", cancelRoot), ("@actor", actor)) == 1,
            "root cancellation reason, actor, and time persisted");
        Check("MEM-08-APPLICATIONS", S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeApplication WHERE Id=@id AND Status=N'Cancelled' AND ClosedReason=N'InitiativeCancelled' AND ClosedAtUtc IS NOT NULL", ("@id", pending)) == 1 &&
            S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeApplicationDecision WHERE ApplicationId=@id AND Action=N'Cancelled' AND Reason=N'Owner approved cancellation test'", ("@id", pending)) == 1 &&
            S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeApplication WHERE Id IN (@a,@b,@c) AND Status=N'Accepted'", ("@a", acceptedApp), ("@b", suspendedApp), ("@c", completedApp)) == 3,
            "open application explicitly cancelled; accepted application history retained");
        Check("MEM-08-MEMBERSHIPS", S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeMembership WHERE Id IN (@a,@b) AND Status=N'Cancelled' AND EndReason=N'InitiativeCancelled' AND EndedAtUtc IS NOT NULL AND CapacityReleasedAtUtc IS NOT NULL", ("@a", acceptedMember), ("@b", suspendedMember)) == 2 &&
            S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeMembership WHERE Id=@id AND Status=N'Completed'", ("@id", completedMember)) == 1 &&
            S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeMembership WHERE InitiativeId=@id AND CapacityReleasedAtUtc IS NULL", ("@id", cancelRoot)) == 0,
            "accepted and suspended terminated, capacity released, completed history retained");
        Check("MEM-08-AUDIT", S<int>(db, "SELECT COUNT(*) FROM ops.AuditEvent WHERE ResourcePublicId=(SELECT PublicId FROM institution.Initiative WHERE Id=@id) AND Action=N'Cancelled' AND Reason=N'Owner approved cancellation test'", ("@id", cancelRoot)) == 1 &&
            S<int>(db, "SELECT COUNT(*) FROM ops.AuditEvent WHERE Action=N'InitiativeCancelled' AND ResourcePublicId IN (SELECT PublicId FROM institution.InitiativeApplication WHERE InitiativeId=@id UNION SELECT PublicId FROM institution.InitiativeMembership WHERE InitiativeId=@id)", ("@id", cancelRoot)) == 3,
            "root, application, and membership audit events present");
        Expect("MEM-08-DUPLICATE", 51703, () => Cancel(db, cancelRoot, actor, "Duplicate"));
        Check("MEM-08-DUPLICATE-STATE", S<int>(db, "SELECT COUNT(*) FROM ops.AuditEvent WHERE ResourcePublicId=(SELECT PublicId FROM institution.Initiative WHERE Id=@id) AND Action=N'Cancelled'", ("@id", cancelRoot)) == 1 &&
            S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeApplicationDecision WHERE ApplicationId=@id AND Action=N'Cancelled'", ("@id", pending)) == 1,
            "duplicate request added no audit or decision side effects");
        Expect("MEM-08-NO-APPLICATION", 51201, () => Submit(db, cancelRoot, Person(db, "after cancel")));
        Expect("MEM-08-NO-APPROVAL", 51201, () => Approve(db, pending, actor));
        Expect("MEM-08-NO-RESCHEDULE", 51602, () => Reschedule(db, cancelRoot, actor, DateTime.UtcNow.AddHours(250)));
        Expect("MEM-08-PERMANENT", 51706, () => N(db, "UPDATE institution.Initiative SET Status=N'Published',CancellationReason=NULL,CancelledAtUtc=NULL,CancelledByPersonId=NULL WHERE Id=@id", ("@id", cancelRoot)));

        var admin = Person(db, "platform cancellation admin");
        N(db, "INSERT iam.GlobalGrant(PersonId,Capability,GrantedByPersonId) VALUES(@admin,N'InitiativeCancellationAdmin',@rep)", ("@admin", admin), ("@rep", actor));
        var (adminRoot, _) = Published(db, institution, actor, 1, DateTime.UtcNow.AddHours(200));
        Cancel(db, adminRoot, admin, "Administrator cancellation");
        Check("MEM-08-ADMIN", S<int>(db, "SELECT COUNT(*) FROM institution.Initiative WHERE Id=@id AND Status=N'Cancelled' AND CancelledByPersonId=@admin", ("@id", adminRoot), ("@admin", admin)) == 1,
            "active platform cancellation grant authorized cancellation");
        var (cancelDraftRoot, cancelDraftId) = Draft(db, institution, actor);
        for (byte stage = 1; stage <= 6; stage++) Save(db, cancelDraftId, actor, stage, Version(db, cancelDraftId));
        Cancel(db, cancelDraftRoot, actor, "Cancel before publication");
        Expect("MEM-08-NO-PUBLICATION", 51106, () => Publish(db, cancelDraftId, actor, 1, DateTime.UtcNow.AddHours(200)));

        var (rollbackRoot, _) = Published(db, institution, actor, 2, DateTime.UtcNow.AddHours(200));
        var rollbackApp = Submit(db, rollbackRoot, Person(db, "rollback pending"));
        var rollbackMember = Approve(db, Submit(db, rollbackRoot, Person(db, "rollback accepted")), actor);
        N(db, "BEGIN TRAN; EXEC(N'CREATE TRIGGER institution.TR_Validation_CancelAbort ON institution.Initiative AFTER UPDATE AS BEGIN IF EXISTS (SELECT 1 FROM inserted WHERE Status=N''Cancelled'') THROW 51799, ''Injected cancellation failure'', 1; END')");
        Expect("MEM-08-ROLLBACK-ERROR", 51799, () => Cancel(db, rollbackRoot, actor, "Should roll back"));
        Check("MEM-08-ROLLBACK-STATE", S<int>(db, "SELECT @@TRANCOUNT") == 0 &&
            S<int>(db, "SELECT COUNT(*) FROM sys.triggers WHERE name=N'TR_Validation_CancelAbort'") == 0 &&
            S<string>(db, "SELECT Status FROM institution.Initiative WHERE Id=@id", ("@id", rollbackRoot)) == "Published" &&
            S<string>(db, "SELECT Status FROM institution.InitiativeApplication WHERE Id=@id", ("@id", rollbackApp)) == "Pending" &&
            S<string>(db, "SELECT Status FROM institution.InitiativeMembership WHERE Id=@id", ("@id", rollbackMember)) == "Accepted" &&
            S<int>(db, "SELECT COUNT(*) FROM institution.InitiativeApplicationDecision WHERE ApplicationId=@id AND Action=N'Cancelled'", ("@id", rollbackApp)) == 0,
            "injected late failure rolled back root, application, membership, decision and test trigger");

        var runtimePerson = Person(db, "runtime withdrawal");
        var (runtimeRoot, _) = Published(db, institution, actor, 1, DateTime.UtcNow.AddHours(200));
        var runtimeMember = Approve(db, Submit(db, runtimeRoot, runtimePerson), actor);
        var clockAccess = S<int>(db, "EXECUTE AS USER=N'deepsprout_runtime_test'; DECLARE @n int=0; BEGIN TRY EXEC ops.EndMembershipAt @MembershipId=@id,@ActorPersonId=@person,@NewStatus=N'Withdrawn',@NowUtc='2000-01-01'; END TRY BEGIN CATCH SET @n=ERROR_NUMBER(); END CATCH; REVERT; SELECT @n;", ("@id", runtimeMember), ("@person", runtimePerson));
        Check("MEM-03-CLOCK-PRIVILEGE", clockAccess == 229, $"runtime direct clock procedure denied with SQL {clockAccess}");
        var publicError = S<int>(db, "EXECUTE AS USER=N'deepsprout_runtime_test'; DECLARE @n int=0; BEGIN TRY EXEC institution.EndMembership @MembershipId=@id,@ActorPersonId=@person,@NewStatus=N'Withdrawn'; END TRY BEGIN CATCH SET @n=ERROR_NUMBER(); END CATCH; REVERT; SELECT @n;", ("@id", runtimeMember), ("@person", runtimePerson));
        Check("MEM-03-RUNTIME-WRAPPER", publicError == 0 && S<string>(db, "SELECT Status FROM institution.InitiativeMembership WHERE Id=@id", ("@id", runtimeMember)) == "Withdrawn",
            $"runtime public command SQL {publicError}; voluntary withdrawal succeeded");
    }

    private static void Cancel(SqlConnection db, long root, long person, string reason) =>
        P(db, "institution.CancelInitiative", ("@InitiativeId", root), ("@ActorPersonId", person), ("@Reason", reason));

    private void Check(string id, bool pass, string detail)
    { if (!pass) Failures++; Log(id, pass ? "PASS" : "FAIL", detail); }
    private void Expect(string id, int number, Action command, string? constraint = null)
    {
        try { command(); Check(id, false, $"Expected SQL {number}, command succeeded"); }
        catch (SqlException e) { Check(id, e.Number == number && (constraint == null || e.Message.Contains(constraint, StringComparison.Ordinal)), $"SQL {e.Number}; {e.Message.Split('\n')[0].Trim()}"); }
    }
    private static void Log(string id, string status, string detail) => Console.WriteLine(JsonSerializer.Serialize(new { timestampUtc = DateTime.UtcNow, id, status, detail }));
    private SqlConnection Open() { var c = new SqlConnection(connectionString); c.Open(); return c; }
    private long Person(SqlConnection c, string label)
    {
        var email = $"{tag}-{Interlocked.Increment(ref seq)}@validation.test";
        var id = S<long>(c, "INSERT iam.Person(DisplayName,Status,IndividualEnabled) OUTPUT INSERTED.Id VALUES(@name,N'Active',1)", ("@name", label));
        N(c, "INSERT iam.PersonEmail(PersonId,NormalizedEmail,Status,IsPrimary,VerifiedAtUtc) VALUES(@id,@email,N'Verified',1,SYSUTCDATETIME())", ("@id", id), ("@email", email)); return id;
    }
    private static long Institution(SqlConnection c, long rep)
    {
        var id = S<long>(c, "INSERT institution.Institution(Name,Status,CountryCode) OUTPUT INSERTED.Id VALUES(N'Validation Institution',N'Verified','JO')");
        N(c, "INSERT institution.RepresentativeMembership(InstitutionId,PersonId,Status,GrantedByPersonId) VALUES(@id,@rep,N'Active',@rep)", ("@id", id), ("@rep", rep)); return id;
    }
    private static (long root, long draft) Draft(SqlConnection c, long inst, long rep)
    {
        using var q = Q(c, "institution.CreateDraft", true, ("@InstitutionId", inst), ("@ActorPersonId", rep));
        var a = q.Parameters.Add("@InitiativeId", SqlDbType.BigInt); a.Direction = ParameterDirection.Output;
        var b = q.Parameters.Add("@DraftId", SqlDbType.BigInt); b.Direction = ParameterDirection.Output;
        q.ExecuteNonQuery(); return ((long)a.Value, (long)b.Value);
    }
    private static byte[] Version(SqlConnection c, long draft) => S<byte[]>(c, "SELECT RowVersion FROM institution.InitiativeDraft WHERE Id=@id", ("@id", draft));
    private static void Save(SqlConnection c, long draft, long rep, byte stage, byte[] version) => P(c, "institution.SaveDraftStage", ("@DraftId", draft), ("@ActorPersonId", rep), ("@ExpectedRowVersion", version), ("@Stage", stage), ("@StageJson", $"{{\"stage\":{stage}}}"));
    private static long Publish(SqlConnection c, long draft, long rep, short capacity, DateTime start)
    {
        using var q = Q(c, "institution.PublishDraft", true, ("@DraftId", draft), ("@ActorPersonId", rep),
            ("@Title", "Validation initiative"), ("@Mode", "Online"), ("@Capacity", capacity), ("@TimeZoneId", "Asia/Amman"),
            ("@StartsAtUtc", start), ("@EndsAtUtc", start.AddHours(3)), ("@Summary", "Validation only"),
            ("@AudienceCode", "Adult"), ("@CompletionPolicyRef", "m1-validation"));
        var output = q.Parameters.Add("@RevisionId", SqlDbType.BigInt); output.Direction = ParameterDirection.Output;
        q.ExecuteNonQuery(); return (long)output.Value;
    }
    private static (long root, long revision) Published(SqlConnection c, long inst, long rep, short capacity, DateTime start)
    {
        var (root, draft) = Draft(c, inst, rep);
        for (byte stage = 1; stage <= 6; stage++) Save(c, draft, rep, stage, Version(c, draft));
        return (root, Publish(c, draft, rep, capacity, start));
    }
    private static long Reschedule(SqlConnection c, long root, long rep, DateTime start)
    {
        using var q = Q(c, "institution.RescheduleInitiative", true, ("@InitiativeId", root), ("@ActorPersonId", rep),
            ("@NewStartsAtUtc", start), ("@NewEndsAtUtc", start.AddHours(3)));
        var output = q.Parameters.Add("@RevisionId", SqlDbType.BigInt); output.Direction = ParameterDirection.Output;
        q.ExecuteNonQuery(); return (long)output.Value;
    }
    private static long Submit(SqlConnection c, long root, long person)
    {
        using var q = Q(c, "institution.SubmitApplication", true, ("@InitiativeId", root), ("@PersonId", person));
        var output = q.Parameters.Add("@ApplicationId", SqlDbType.BigInt); output.Direction = ParameterDirection.Output;
        q.ExecuteNonQuery(); return (long)output.Value;
    }
    private static long Approve(SqlConnection c, long app, long rep)
    {
        using var q = Q(c, "institution.ApproveApplication", true, ("@ApplicationId", app), ("@ActorPersonId", rep));
        var output = q.Parameters.Add("@MembershipId", SqlDbType.BigInt); output.Direction = ParameterDirection.Output;
        q.ExecuteNonQuery(); return (long)output.Value;
    }
    private static void Reject(SqlConnection c, long app, long rep, bool block) => P(c, "institution.RejectApplication", ("@ApplicationId", app), ("@ActorPersonId", rep), ("@Block", block));
    private static long Invite(SqlConnection c, long root, long rep, long person) => S<long>(c,
        "INSERT institution.InitiativeStaffInvitation(InitiativeId,NormalizedEmail,Role,TokenHash,ExpiresAtUtc,Status,InvitedByPersonId) OUTPUT INSERTED.Id SELECT @root,NormalizedEmail,N'Supervisor',HASHBYTES('SHA2_256',CONVERT(nvarchar(36),NEWID())),DATEADD(day,2,SYSUTCDATETIME()),N'Pending',@rep FROM iam.PersonEmail WHERE PersonId=@person AND Status=N'Verified'",
        ("@root", root), ("@rep", rep), ("@person", person));
    private static long AcceptInvite(SqlConnection c, long invitation, long person)
    {
        using var q = Q(c, "institution.AcceptStaffInvitation", true, ("@InvitationId", invitation), ("@PersonId", person));
        var output = q.Parameters.Add("@AppointmentId", SqlDbType.BigInt); output.Direction = ParameterDirection.Output;
        q.ExecuteNonQuery(); return (long)output.Value;
    }
    private static SqlCommand Q(SqlConnection c, string text, bool proc, params (string name, object? value)[] args)
    {
        var q = c.CreateCommand(); q.CommandText = text; q.CommandTimeout = 30; q.CommandType = proc ? CommandType.StoredProcedure : CommandType.Text;
        foreach (var (name, value) in args)
        {
            if (value is DateTime at)
            {
                var parameter = q.Parameters.Add(name, SqlDbType.DateTime2);
                parameter.Scale = 3;
                parameter.Value = at;
            }
            else q.Parameters.AddWithValue(name, value ?? DBNull.Value);
        }
        return q;
    }
    private static T S<T>(SqlConnection c, string text, params (string name, object? value)[] args)
    {
        using var q = Q(c, text, false, args);
        var value = q.ExecuteScalar() ?? throw new InvalidOperationException($"No scalar result: {text}");
        return value is T typed ? typed : (T)Convert.ChangeType(value, typeof(T));
    }
    private static void N(SqlConnection c, string text, params (string name, object? value)[] args)
    { using var q = Q(c, text, false, args); q.ExecuteNonQuery(); }
    private static void P(SqlConnection c, string text, params (string name, object? value)[] args)
    { using var q = Q(c, text, true, args); q.ExecuteNonQuery(); }
}
