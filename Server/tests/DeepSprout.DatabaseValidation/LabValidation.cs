using System.Data;
using System.Text.Json;
using Microsoft.Data.SqlClient;

internal sealed class LabValidation(string connectionString)
{
    private readonly string tag = "lab-" + Guid.NewGuid().ToString("N")[..10];
    public int Failures { get; private set; }

    public async Task Execute()
    {
        using var db = Open();
        var server = Scalar<string>(db, "SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var database = Scalar<string>(db, "SELECT DB_NAME()");
        if (server != "DESKTOP-A4AL2KR" || database != "DeepSprout_Validation") throw new Exception($"Wrong target {server}/{database}");
        Check("LAB-ENV", true, $"{server}/{database}; SPID={Scalar<int>(db, "SELECT @@SPID")}");
        Check("LAB-SCHEMA", Scalar<int>(db, "SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name IN (N'lab',N'personal')") == 7 &&
            Scalar<int>(db, "SELECT COUNT(*) FROM dbo.__EFMigrationsHistory") >=5 &&
            Scalar<int>(db, "SELECT COUNT(*) FROM sys.foreign_keys WHERE is_not_trusted=1 OR is_disabled=1") == 0 &&
            Scalar<int>(db, "SELECT COUNT(*) FROM sys.check_constraints WHERE is_not_trusted=1 OR is_disabled=1") == 0,
            "7 Lab/personal tables, 5 migrations, zero untrusted or disabled FK/CHECK");

        var p1 = InsertId(db, "INSERT iam.Person(DisplayName,Status,IndividualEnabled) OUTPUT INSERTED.Id VALUES(@name,N'Active',1)", ("@name", tag + " owner"));
        var p2 = InsertId(db, "INSERT iam.Person(DisplayName,Status,IndividualEnabled) OUTPUT INSERTED.Id VALUES(@name,N'Active',1)", ("@name", tag + " other"));
        var instrument1 = InsertId(db, "INSERT lab.AssessmentInstrument(Code,Title,Status) OUTPUT INSERTED.Id VALUES(@code,N'Lab fixture',N'Published')", ("@code", tag + "-a"));
        var instrument2 = InsertId(db, "INSERT lab.AssessmentInstrument(Code,Title,Status) OUTPUT INSERTED.Id VALUES(@code,N'Lab fixture 2',N'Published')", ("@code", tag + "-b"));
        var version = InsertId(db, "INSERT lab.InstrumentVersion(InstrumentId,VersionNo,ContentRef,ScoringVersion,ProtocolVersion,PublishedAtUtc) OUTPUT INSERTED.Id VALUES(@id,1,N'fixture-ref',N's1',N'p1',SYSUTCDATETIME())", ("@id", instrument1));
        var window = InsertId(db, "INSERT lab.AssessmentWindow(PersonId,WindowKey,PolicyVersion,OpensAtUtc,ClosesAtUtc,Status) OUTPUT INSERTED.Id VALUES(@person,@key,N'policy-1',DATEADD(hour,-1,SYSUTCDATETIME()),DATEADD(hour,1,SYSUTCDATETIME()),N'Open')", ("@person", p1), ("@key", tag));
        Expect("LAB-WINDOW-INTERVAL", 547, () => Execute(db, "INSERT lab.AssessmentWindow(PersonId,WindowKey,PolicyVersion,OpensAtUtc,ClosesAtUtc,Status) VALUES(@person,@key,N'p',DATEADD(hour,1,SYSUTCDATETIME()),SYSUTCDATETIME(),N'Open')", ("@person", p1), ("@key", tag + "-bad")), "CK_AssessmentWindow_Interval");
        Expect("LAB-WINDOW-UNIQUE", 2601, () => Execute(db, "INSERT lab.AssessmentWindow(PersonId,WindowKey,PolicyVersion,OpensAtUtc,ClosesAtUtc,Status) VALUES(@person,@key,N'p',SYSUTCDATETIME(),DATEADD(hour,1,SYSUTCDATETIME()),N'Open')", ("@person", p1), ("@key", tag)));
        Expect("LAB-WINDOW-OWNER", 547, () => NewAttempt(db, p2, instrument1, version, window), "FK_AssessmentAttempt_AssessmentWindow_WindowId_PersonId");
        Expect("LAB-VERSION-INSTRUMENT", 547, () => NewAttempt(db, p1, instrument2, version, null), "FK_AssessmentAttempt_InstrumentVersion_InstrumentVersionId_InstrumentId");
        var otherAttempt = NewAttempt(db, p2, instrument1, version, null);
        Expect("LAB-PROFILE-OWNER", 547, () => Execute(db, "INSERT personal.IndividualProfile(PersonId,PreferredTimeZone,PreferenceVersion,OnboardingStage,LastAssessmentAttemptId) VALUES(@person,N'Asia/Amman',1,N'Baselines',@attempt)", ("@person", p1), ("@attempt", otherAttempt)), "FK_IndividualProfile_AssessmentAttempt_LastAssessmentAttemptId_PersonId");
        Execute(db, "INSERT personal.IndividualProfile(PersonId,PreferredTimeZone,PreferenceVersion,OnboardingStage,LastAssessmentAttemptId) VALUES(@person,N'Asia/Amman',1,N'Baselines',NULL)", ("@person", p1));
        var attempt1 = NewAttempt(db, p1, instrument1, version, window);
        Execute(db, "INSERT lab.AssessmentResponse(AttemptId,ItemKey,TrialNo,ResponseNumber,LatencyMs,RecordedAtUtc) VALUES(@attempt,N'item-1',1,2.5,100,SYSUTCDATETIME())", ("@attempt", attempt1));
        Expect("LAB-RESPONSE-TRIAL", 547, () => Execute(db, "INSERT lab.AssessmentResponse(AttemptId,ItemKey,TrialNo,RecordedAtUtc) VALUES(@attempt,N'item-2',0,SYSUTCDATETIME())", ("@attempt", attempt1)), "CK_AssessmentResponse_Trial");
        Execute(db, "UPDATE lab.AssessmentAttempt SET Status=N'Submitted',FinishedAtUtc=SYSUTCDATETIME() WHERE Id=@id", ("@id", attempt1));
        Expect("LAB-RESPONSE-SEALED", 52003, () => Execute(db, "INSERT lab.AssessmentResponse(AttemptId,ItemKey,TrialNo,RecordedAtUtc) VALUES(@attempt,N'item-2',1,SYSUTCDATETIME())", ("@attempt", attempt1)));
        Expect("LAB-VERSION-IMMUTABLE", 52001, () => Execute(db, "UPDATE lab.InstrumentVersion SET ContentRef=N'tamper' WHERE Id=@id", ("@id", version)));
        Execute(db, "UPDATE personal.IndividualProfile SET LastAssessmentAttemptId=@attempt WHERE PersonId=@person", ("@attempt", attempt1), ("@person", p1));
        Check("LAB-PROFILE-LINK", Scalar<long>(db, "SELECT LastAssessmentAttemptId FROM personal.IndividualProfile WHERE PersonId=@person", ("@person", p1)) == attempt1,
            "same-person profile link persisted");
        var attempt2 = NewAttempt(db, p1, instrument1, version, null);
        Execute(db, "UPDATE lab.AssessmentAttempt SET Status=N'Submitted',FinishedAtUtc=SYSUTCDATETIME() WHERE Id=@id", ("@id", attempt2));
        var race = await Race(attempt1, attempt2);
        var valid = Scalar<int>(db, "SELECT COUNT(*) FROM lab.AssessmentAttempt WHERE Id IN (@a,@b) AND Status=N'Valid'", ("@a", attempt1), ("@b", attempt2));
        Check("LAB-BASELINE-RACE", race.Count(x => x.error == 0) == 1 && race.Count(x => x.error is 2601 or 2627) == 1 && valid == 1,
            $"SPIDs={string.Join(',', race.Select(x=>x.spid))}; errors={string.Join(',', race.Select(x=>x.error))}; valid={valid}");
        var validAttempt = Scalar<long>(db, "SELECT Id FROM lab.AssessmentAttempt WHERE Id IN (@a,@b) AND Status=N'Valid'", ("@a", attempt1), ("@b", attempt2));
        var score = InsertId(db, "INSERT lab.AssessmentScore(AttemptId,ScoringVersion,MetricCode,Value,Comparable,ComputedAtUtc) OUTPUT INSERTED.Id VALUES(@attempt,N's1',N'metric-a',1.25,1,SYSUTCDATETIME())", ("@attempt", validAttempt));
        Expect("LAB-SCORE-IMMUTABLE", 52002, () => Execute(db, "UPDATE lab.AssessmentScore SET Value=8 WHERE Id=@id", ("@id", score)));
        Expect("LAB-TRANSITION", 52004, () => Execute(db, "UPDATE lab.AssessmentAttempt SET Status=N'Paused',FinishedAtUtc=NULL WHERE Id=@id", ("@id", validAttempt)));
        Check("LAB-M1-PRESERVATION", Scalar<int>(db, "SELECT COUNT(*) FROM institution.Initiative") > 0 &&
            Scalar<int>(db, "SELECT COUNT(*) FROM dbo.__EFMigrationsHistory WHERE MigrationId=N'20261101053400_CancellationAndWithdrawalRights'") == 1,
            "M1 rows and its applied migration remain present");
        Log("LAB-SUMMARY", Failures == 0 ? "PASS" : "FAIL", $"failures={Failures}; fixtureTag={tag}");
    }

    private async Task<(int spid, int error)[]> Race(long a, long b)
    {
        using var gate = new Barrier(2);
        async Task<(int spid, int error)> Call(long id)
        {
            using var db = new SqlConnection(connectionString); await db.OpenAsync();
            var spid = Scalar<int>(db, "SELECT @@SPID");
            if (!gate.SignalAndWait(TimeSpan.FromSeconds(15))) throw new TimeoutException("Lab race barrier timed out");
            try { Execute(db, "UPDATE lab.AssessmentAttempt SET Status=N'Valid' WHERE Id=@id", ("@id", id)); return (spid, 0); }
            catch (SqlException e) { return (spid, e.Number); }
        }
        return await Task.WhenAll(Task.Run(() => Call(a)), Task.Run(() => Call(b)));
    }
    private static long NewAttempt(SqlConnection db, long person, long instrument, long version, long? window) =>
        InsertId(db, "INSERT lab.AssessmentAttempt(PersonId,InstrumentId,InstrumentVersionId,WindowId,Kind,Status,StartedAtUtc) OUTPUT INSERTED.Id VALUES(@person,@instrument,@version,@window,N'Baseline',N'Started',SYSUTCDATETIME())",
            ("@person", person), ("@instrument", instrument), ("@version", version), ("@window", window));
    private static SqlConnection OpenConnection(string connectionString) { var db = new SqlConnection(connectionString); db.Open(); return db; }
    private SqlConnection Open() => OpenConnection(connectionString);
    private static SqlCommand Command(SqlConnection db, string sql, params (string name, object? value)[] args)
    {
        var command = db.CreateCommand(); command.CommandText = sql; command.CommandTimeout = 30;
        foreach (var (name, value) in args) command.Parameters.AddWithValue(name, value ?? DBNull.Value);
        return command;
    }
    private static T Scalar<T>(SqlConnection db, string sql, params (string name, object? value)[] args)
    { using var command = Command(db, sql, args); var value = command.ExecuteScalar()!; return value is T result ? result : (T)Convert.ChangeType(value, typeof(T)); }
    private static long InsertId(SqlConnection db, string sql, params (string name, object? value)[] args) => Scalar<long>(db, sql, args);
    private static void Execute(SqlConnection db, string sql, params (string name, object? value)[] args)
    { using var command = Command(db, sql, args); command.ExecuteNonQuery(); }
    private void Check(string id, bool pass, string detail)
    { if (!pass) Failures++; Log(id, pass ? "PASS" : "FAIL", detail); }
    private void Expect(string id, int error, Action action, string? constraint = null)
    {
        try { action(); Check(id, false, $"expected SQL {error}, succeeded"); }
        catch (SqlException e) { Check(id, e.Number == error && (constraint == null || e.Message.Contains(constraint, StringComparison.Ordinal)), $"SQL {e.Number}; {e.Message.Split('\n')[0].Trim()}"); }
    }
    private static void Log(string id, string status, string detail) =>
        Console.WriteLine(JsonSerializer.Serialize(new { timestampUtc = DateTime.UtcNow, id, status, detail }));
}

