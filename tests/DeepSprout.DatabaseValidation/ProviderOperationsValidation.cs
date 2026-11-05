using System.Text.Json;
using Microsoft.Data.SqlClient;

internal sealed class ProviderOperationsValidation(string connectionString)
{
    private readonly string tag="provider-ops-"+Guid.NewGuid().ToString("N")[..10];
    public int Failures{get;private set;}
    public async Task Execute()
    {
        using var db=Open();
        var server=S<string>(db,"SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var name=S<string>(db,"SELECT DB_NAME()");
        if(server!="DESKTOP-A4AL2KR"||name!="DeepSprout_Validation")throw new Exception($"Wrong target {server}/{name}");
        Check("PO-ENV",true,$"{server}/{name}; SPID={S<int>(db,"SELECT @@SPID")}");
        Check("PO-SCHEMA",S<int>(db,"SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=N'provider'")==17&&
            S<int>(db,"SELECT COUNT(*) FROM dbo.__EFMigrationsHistory")>=17&&
            S<int>(db,"SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1")==0&&
            S<int>(db,"SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1")==0,
            "17 Provider tables, 17 migrations, trusted FK/CHECK");
        var staff=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" staff"));
        var booker=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" booker"));
        var other=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" other"));
        var provider=Id(db,"INSERT provider.Provider(Name,Status,CountryCode) VALUES(@n,N'Approved','JO');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag));
        var exp=Id(db,"INSERT provider.Experience(ProviderId,Kind,Title,Status,Capacity,TimeZoneId,StartAtUtc,EndAtUtc) VALUES(@p,N'Camp',@n,N'Published',3,N'UTC',DATEADD(day,1,SYSUTCDATETIME()),DATEADD(day,2,SYSUTCDATETIME()));SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",provider),("@n",tag));
        var rev=Id(db,"INSERT provider.ExperienceRevision(ExperienceId,RevisionNo,Venue,SafetyRef,ConsentVersion,CostKind,CompletionRuleRef,PublishedAtUtc) VALUES(@e,1,N'Venue',N'Safety',N'1',N'Free',N'Rule',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@e",exp));
        var session=Id(db,"INSERT provider.ExperienceSession(ExperienceId,Title,Mode,Status,StartsAtUtc,EndsAtUtc) VALUES(@e,N'Day 1',N'Onsite',N'Published',DATEADD(day,1,SYSUTCDATETIME()),DATEADD(day,2,SYSUTCDATETIME()));SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@e",exp));
        var booking=Id(db,"INSERT provider.ExperienceBooking(ExperienceId,PersonId,RevisionId,Status,Mode,BookedAtUtc) VALUES(@e,@p,@r,N'Confirmed',N'Onsite',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@e",exp),("@p",booker),("@r",rev));
        var queued=Id(db,"INSERT provider.ExperienceBooking(ExperienceId,PersonId,RevisionId,Status,Mode,BookedAtUtc) VALUES(@e,@p,@r,N'Queued',N'Onsite',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@e",exp),("@p",other),("@r",rev));
        var email=tag+"@example.test";
        N(db,"INSERT iam.PersonEmail(PersonId,NormalizedEmail,Status,IsPrimary,VerifiedAtUtc) VALUES(@p,@email,N'Verified',1,SYSUTCDATETIME())",("@p",staff),("@email",email));
        var invite=Id(db,"INSERT provider.ProviderStaffInvitation(ExperienceId,NormalizedEmail,TokenHash,Status,InvitedByPersonId,ExpiresAtUtc) VALUES(@e,@email,0x0102,N'Pending',@p,DATEADD(day,1,SYSUTCDATETIME()));SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@e",exp),("@email",email),("@p",staff));
        Expect("PO-STAFF-EMAIL",63001,()=>N(db,"INSERT provider.ProviderStaffAppointment(ExperienceId,PersonId,InvitationId,Status,AcceptedAtUtc) VALUES(@e,@p,@i,N'Active',SYSUTCDATETIME())",("@e",exp),("@p",other),("@i",invite)));
        var appointment=Id(db,"INSERT provider.ProviderStaffAppointment(ExperienceId,PersonId,InvitationId,Status,AcceptedAtUtc) VALUES(@e,@p,@i,N'Active',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@e",exp),("@p",staff),("@i",invite));
        N(db,"INSERT provider.ProviderAppointmentSession(ExperienceId,AppointmentId,SessionId) VALUES(@e,@a,@s)",("@e",exp),("@a",appointment),("@s",session));
        Expect("PO-STAFF-SESSION-UNIQUE",2601,()=>N(db,"INSERT provider.ProviderAppointmentSession(ExperienceId,AppointmentId,SessionId) VALUES(@e,@a,@s)",("@e",exp),("@a",appointment),("@s",session)));
        var cohort1=Id(db,"INSERT provider.ProviderCohort(ExperienceId,SupervisorAppointmentId,Name,Status) VALUES(@e,@a,N'Cohort A',N'Active');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@e",exp),("@a",appointment));
        var cohort2=Id(db,"INSERT provider.ProviderCohort(ExperienceId,SupervisorAppointmentId,Name,Status) VALUES(@e,@a,N'Cohort B',N'Active');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@e",exp),("@a",appointment));
        Expect("PO-COHORT-BOOKING",63004,()=>N(db,"INSERT provider.ProviderCohortMember(CohortId,BookingId,ExperienceId,JoinedAtUtc) VALUES(@c,@b,@e,SYSUTCDATETIME())",("@c",cohort1),("@b",queued),("@e",exp)));
        var race=await Race(cohort1,cohort2,booking,exp);
        Check("PO-COHORT-RACE",race.Count(x=>x.error==0)==1&&race.Count(x=>x.error is 2601 or 2627)==1&&race[0].spid!=race[1].spid,
            $"SPIDs={string.Join(',',race.Select(x=>x.spid))}; errors={string.Join(',',race.Select(x=>x.error))}");
        Expect("PO-ATTENDANCE-RECORDER",63007,()=>N(db,"INSERT provider.ProviderAttendance(ExperienceId,BookingId,SessionId,Status,Method,RecordedByPersonId,RecordedAtUtc) VALUES(@e,@b,@s,N'Present',N'Manual',@p,SYSUTCDATETIME())",("@e",exp),("@b",booking),("@s",session),("@p",other)));
        var ev=Id(db,"INSERT evidence.EvidenceEvent(SourceContext,SourceKey,SubjectPersonId,Kind,Provenance,SourceVersion,OccurredAtUtc,Validity) VALUES(N'provider',@key,@p,N'Attendance',N'Validation',N'1',SYSUTCDATETIME(),N'Accepted');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@key",tag),("@p",other));
        Expect("PO-ATTENDANCE-EVIDENCE",63006,()=>N(db,"INSERT provider.ProviderAttendance(ExperienceId,BookingId,SessionId,Status,Method,RecordedByPersonId,EvidenceEventId,RecordedAtUtc) VALUES(@e,@b,@s,N'Present',N'Manual',@p,@ev,SYSUTCDATETIME())",("@e",exp),("@b",booking),("@s",session),("@p",staff),("@ev",ev)));
        var attendance=Id(db,"INSERT provider.ProviderAttendance(ExperienceId,BookingId,SessionId,Status,Method,RecordedByPersonId,RecordedAtUtc) VALUES(@e,@b,@s,N'Present',N'Manual',@p,SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@e",exp),("@b",booking),("@s",session),("@p",staff));
        var correction=Id(db,"INSERT provider.ProviderAttendanceCorrection(AttendanceId,OldStatus,NewStatus,CorrectedByPersonId,Reason,CorrectedAtUtc) VALUES(@a,N'Present',N'Late',@p,N'Corrected',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@a",attendance),("@p",staff));
        Expect("PO-CORRECTION-IMMUTABLE",63008,()=>N(db,"UPDATE provider.ProviderAttendanceCorrection SET Reason=N'Tamper' WHERE Id=@c",("@c",correction)));
        Expect("PO-COMPLETION-EVIDENCE",63009,()=>N(db,"INSERT provider.CampCompletion(ExperienceId,BookingId,RuleRevisionId,Status,EvaluatorPersonId,EvidenceEventId) VALUES(@e,@b,@r,N'Completed',@p,@ev)",("@e",exp),("@b",booking),("@r",rev),("@p",staff),("@ev",ev)));
        N(db,"INSERT provider.CampCompletion(ExperienceId,BookingId,RuleRevisionId,Status,EvaluatorPersonId) VALUES(@e,@b,@r,N'Pending',@p)",("@e",exp),("@b",booking),("@r",rev),("@p",staff));
        Expect("PO-COMPLETION-UNIQUE",2601,()=>N(db,"INSERT provider.CampCompletion(ExperienceId,BookingId,RuleRevisionId,Status,EvaluatorPersonId) VALUES(@e,@b,@r,N'Pending',@p)",("@e",exp),("@b",booking),("@r",rev),("@p",staff)));
        var incident=Id(db,"INSERT provider.ProviderIncident(ExperienceId,BookingId,ReportedByPersonId,Summary,Status,OccurredAtUtc) VALUES(@e,@b,@p,N'Incident',N'Open',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@e",exp),("@b",booking),("@p",staff));
        Check("PO-INCIDENT",incident>0,"incident linked to same Experience booking");
        Check("PO-PRESERVATION",S<int>(db,"SELECT COUNT(*) FROM provider.ExperienceBooking")>0&&S<int>(db,"SELECT COUNT(*) FROM institution.Initiative")>0,"Provider foundation and M1 rows retained");
        Log("PO-SUMMARY",Failures==0?"PASS":"FAIL",$"failures={Failures}; fixtureTag={tag}");
    }
    private async Task<(int spid,int error)[]> Race(long c1,long c2,long booking,long exp)
    {
        using var gate=new Barrier(2);
        async Task<(int spid,int error)> Call(long cohort)
        {using var db=Open();var spid=S<int>(db,"SELECT @@SPID");if(!gate.SignalAndWait(TimeSpan.FromSeconds(15)))throw new TimeoutException("cohort race timed out");
            try{N(db,"INSERT provider.ProviderCohortMember(CohortId,BookingId,ExperienceId,JoinedAtUtc) VALUES(@c,@b,@e,SYSUTCDATETIME())",("@c",cohort),("@b",booking),("@e",exp));return(spid,0);}catch(SqlException e){return(spid,e.Number);}}
        return await Task.WhenAll(Task.Run(()=>Call(c1)),Task.Run(()=>Call(c2)));
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

