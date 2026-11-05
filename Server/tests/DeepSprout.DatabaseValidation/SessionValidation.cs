using System.Text.Json;
using Microsoft.Data.SqlClient;

internal sealed class SessionValidation(string connectionString)
{
    private readonly string tag="session-"+Guid.NewGuid().ToString("N")[..10];
    public int Failures{get;private set;}
    public async Task Execute()
    {
        using var db=Open();
        var server=S<string>(db,"SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var name=S<string>(db,"SELECT DB_NAME()");
        if(server!="DESKTOP-A4AL2KR"||name!="DeepSprout_Validation")throw new Exception($"Wrong target {server}/{name}");
        Check("SESS-ENV",true,$"{server}/{name}; SPID={S<int>(db,"SELECT @@SPID")}");
        Check("SESS-SCHEMA",S<int>(db,"SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=N'session'")==10&&
            S<int>(db,"SELECT COUNT(*) FROM dbo.__EFMigrationsHistory")>=15&&
            S<int>(db,"SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1")==0&&
            S<int>(db,"SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1")==0,
            "10 session tables, 15 migrations, all FK/CHECK trusted");
        var p1=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" p1"));
        var p2=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" p2"));
        var p3=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" p3"));
        var institution=S<long>(db,"SELECT TOP(1) InstitutionId FROM institution.Initiative ORDER BY Id");
        Expect("SESS-TIME",547,()=>N(db,"INSERT session.Session(InstitutionId,Title,Mode,Status,TimeZoneId,AttendanceRequired,StartAtUtc,EndAtUtc) VALUES(@i,N'Bad',N'Onsite',N'Draft',N'UTC',1,DATEADD(day,2,SYSUTCDATETIME()),DATEADD(day,1,SYSUTCDATETIME()))",("@i",institution)),"CK_Session_Times");
        var sess=Id(db,"INSERT session.Session(InstitutionId,Title,Mode,Status,TimeZoneId,AttendanceRequired,StartAtUtc,EndAtUtc) VALUES(@i,@n,N'Onsite',N'Draft',N'UTC',1,DATEADD(day,1,SYSUTCDATETIME()),DATEADD(day,2,SYSUTCDATETIME()));SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@i",institution),("@n",tag));
        var rev=Id(db,"INSERT session.SessionRevision(SessionId,RevisionNo,CheckInBeforeMinutes,CheckInAfterMinutes,CompletionRuleRef,PublishedAtUtc) VALUES(@s,1,15,15,N'validation',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@s",sess));
        Expect("SESS-REV-IMMUTABLE",61001,()=>N(db,"UPDATE session.SessionRevision SET CompletionRuleRef=N'Tamper' WHERE Id=@r",("@r",rev)));
        var pool=Id(db,"INSERT session.SessionCapacityPool(SessionId,Mode,Capacity) VALUES(@s,N'Onsite',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@s",sess));
        Expect("SESS-DRAFT-REGISTER",61012,()=>Register(db,sess,p1,pool));
        N(db,"UPDATE session.Session SET Status=N'Published' WHERE Id=@s",("@s",sess));
        var race=await Race(sess,p1,p2,pool);
        Check("SESS-CAPACITY-RACE",race.Count(x=>x.error==0)==1&&race.Count(x=>x.error==61005)==1&&race[0].spid!=race[1].spid&&
            S<int>(db,"SELECT COUNT(*) FROM session.SessionRegistration WHERE PoolId=@p AND Status=N'Confirmed'",("@p",pool))==1,
            $"SPIDs={string.Join(',',race.Select(x=>x.spid))}; errors={string.Join(',',race.Select(x=>x.error))}");
        var reg=S<long>(db,"SELECT TOP(1) Id FROM session.SessionRegistration WHERE PoolId=@p",("@p",pool));
        var regPerson=S<long>(db,"SELECT PersonId FROM session.SessionRegistration WHERE Id=@r",("@r",reg));
        var otherPerson=regPerson==p1?p2:p1;
        var session2=Id(db,"INSERT session.Session(InstitutionId,Title,Mode,Status,TimeZoneId,AttendanceRequired,StartAtUtc,EndAtUtc) VALUES(@i,@n,N'Onsite',N'Published',N'UTC',1,DATEADD(day,1,SYSUTCDATETIME()),DATEADD(day,2,SYSUTCDATETIME()));SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@i",institution),("@n",tag+" second"));
        var rev2=Id(db,"INSERT session.SessionRevision(SessionId,RevisionNo,CheckInBeforeMinutes,CheckInAfterMinutes,CompletionRuleRef,PublishedAtUtc) VALUES(@s,1,15,15,N'validation',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@s",session2));
        Expect("SESS-POOL-OWNER",547,()=>N(db,"INSERT session.SessionRegistration(SessionId,PersonId,PoolId,SessionRevisionId,Status,RegisteredAtUtc) VALUES(@s,@person,@pool,@rev,N'Pending',SYSUTCDATETIME())",("@s",session2),("@person",otherPerson),("@pool",pool),("@rev",rev2)),"FK_SessionRegistration_SessionCapacityPool_PoolId_SessionId");
        Expect("SESS-REV-OWNER",547,()=>N(db,"INSERT session.SessionRegistration(SessionId,PersonId,PoolId,SessionRevisionId,Status,RegisteredAtUtc) VALUES(@s,@person,@pool,@rev,N'Pending',SYSUTCDATETIME())",("@s",sess),("@person",otherPerson),("@pool",pool),("@rev",rev2)),"FK_SessionRegistration_SessionRevision_SessionRevisionId_SessionId");
        var extraPool=Id(db,"INSERT session.SessionCapacityPool(SessionId,Mode,Capacity) VALUES(@s,N'Online',2);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@s",sess));
        Register(db,sess,otherPerson,extraPool);
        Register(db,sess,p3,extraPool);
        Expect("SESS-POOL-SHRINK",61003,()=>N(db,"UPDATE session.SessionCapacityPool SET Capacity=1 WHERE Id=@p",("@p",extraPool)));
        Expect("SESS-ATTENDANCE-OWNER",547,()=>N(db,"INSERT session.SessionAttendance(RegistrationId,SessionId,PersonId,Status,Method,RecordedByPersonId,RecordedAtUtc) VALUES(@r,@s,@person,N'Absent',N'Manual',@actor,SYSUTCDATETIME())",("@r",reg),("@s",sess),("@person",otherPerson),("@actor",p1)),"FK_SessionAttendance_SessionRegistration_RegistrationId_SessionId_PersonId");
        var attendance=Id(db,"INSERT session.SessionAttendance(RegistrationId,SessionId,PersonId,Status,Method,RecordedByPersonId,RecordedAtUtc) VALUES(@r,@s,@person,N'NotRecorded',N'Manual',@actor,SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@r",reg),("@s",sess),("@person",regPerson),("@actor",p1));
        Expect("SESS-EXCUSE-FACT",61010,()=>N(db,"INSERT session.AbsenceExcuse(AttendanceId,SubmittedByPersonId,Reason,Status) VALUES(@a,@p,N'Excuse',N'Submitted')",("@a",attendance),("@p",regPerson)));
        N(db,"UPDATE session.SessionAttendance SET Status=N'Absent' WHERE Id=@a",("@a",attendance));
        Expect("SESS-EXCUSE-PERSON",61010,()=>N(db,"INSERT session.AbsenceExcuse(AttendanceId,SubmittedByPersonId,Reason,Status) VALUES(@a,@p,N'Excuse',N'Submitted')",("@a",attendance),("@p",otherPerson)));
        N(db,"INSERT session.AbsenceExcuse(AttendanceId,SubmittedByPersonId,Reason,Status) VALUES(@a,@p,N'Excuse',N'Submitted')",("@a",attendance),("@p",regPerson));
        var correction=Id(db,"INSERT session.AttendanceCorrection(AttendanceId,OldStatus,NewStatus,CorrectedByPersonId,Reason,CorrectedAtUtc) VALUES(@a,N'NotRecorded',N'Absent',@p,N'Correction',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@a",attendance),("@p",p1));
        Expect("SESS-CORRECTION-IMMUTABLE",61009,()=>N(db,"UPDATE session.AttendanceCorrection SET Reason=N'Tamper' WHERE Id=@id",("@id",correction)));
        Expect("SESS-STANDALONE-EMAIL",61008,()=>N(db,"INSERT session.StandaloneSessionSupervisorAppointment(SessionId,PersonId,NormalizedEmail,InvitedByPersonId,TokenHash,Status,ExpiresAtUtc,AcceptedAtUtc) VALUES(@s,@p,@email,@p,0x0102,N'Active',DATEADD(day,1,SYSUTCDATETIME()),SYSUTCDATETIME())",("@s",sess),("@p",p1),("@email",tag+"@example.test")));
        Check("SESS-PRESERVATION",S<int>(db,"SELECT COUNT(*) FROM institution.Initiative")>0&&S<int>(db,"SELECT COUNT(*) FROM community.Post")>0,"M1 and Community rows retained");
        Log("SESS-SUMMARY",Failures==0?"PASS":"FAIL",$"failures={Failures}; fixtureTag={tag}");
    }
    private static long Register(SqlConnection db,long session,long person,long pool)=>S<long>(db,"DECLARE @id bigint; EXEC session.RegisterConfirmed @SessionId=@s,@PersonId=@person,@PoolId=@pool,@RegistrationId=@id OUTPUT;SELECT @id",("@s",session),("@person",person),("@pool",pool));
    private async Task<(int spid,int error)[]> Race(long session,long p1,long p2,long pool)
    {
        using var gate=new Barrier(2);
        async Task<(int spid,int error)> Call(long person)
        {
            using var db=Open();var spid=S<int>(db,"SELECT @@SPID");
            if(!gate.SignalAndWait(TimeSpan.FromSeconds(15)))throw new TimeoutException("session race timed out");
            try{Register(db,session,person,pool);return(spid,0);}catch(SqlException e){return(spid,e.Number);}
        }
        return await Task.WhenAll(Task.Run(()=>Call(p1)),Task.Run(()=>Call(p2)));
    }
    private SqlConnection Open(){var db=new SqlConnection(connectionString);db.Open();return db;}
    private static SqlCommand Q(SqlConnection db,string sql,params(string name,object? value)[] args)
    {var c=db.CreateCommand();c.CommandText=sql;c.CommandTimeout=30;foreach(var(name,value)in args)c.Parameters.AddWithValue(name,value??DBNull.Value);return c;}
    private static T S<T>(SqlConnection db,string sql,params(string name,object? value)[] args)
    {using var c=Q(db,sql,args);var v=c.ExecuteScalar()!;return v is T t?t:(T)Convert.ChangeType(v,typeof(T));}
    private static long Id(SqlConnection db,string sql,params(string name,object? value)[] args)=>S<long>(db,sql,args);
    private static void N(SqlConnection db,string sql,params(string name,object? value)[] args){using var c=Q(db,sql,args);c.ExecuteNonQuery();}
    private void Check(string id,bool pass,string detail){if(!pass)Failures++;Log(id,pass?"PASS":"FAIL",detail);}
    private void Expect(string id,int number,Action action,string? constraint=null)
    {try{action();Check(id,false,$"expected SQL {number}, succeeded");}catch(SqlException e){Check(id,e.Number==number&&(constraint==null||e.Message.Contains(constraint,StringComparison.Ordinal)),$"SQL {e.Number}; {e.Message.Split('\n')[0].Trim()}");}}
    private static void Log(string id,string status,string detail)=>Console.WriteLine(JsonSerializer.Serialize(new{timestampUtc=DateTime.UtcNow,id,status,detail}));
}

