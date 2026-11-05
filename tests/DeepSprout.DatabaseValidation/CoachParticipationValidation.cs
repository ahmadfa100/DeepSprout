using System.Text.Json;
using Microsoft.Data.SqlClient;

internal sealed class CoachParticipationValidation(string connectionString)
{
    private readonly string tag = "coach-part-" + Guid.NewGuid().ToString("N")[..10];
    public int Failures { get; private set; }

    public async Task Execute()
    {
        using var db = Open();
        var server = S<string>(db, "SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var name = S<string>(db, "SELECT DB_NAME()");
        if (server != "DESKTOP-A4AL2KR" || name != "DeepSprout_Validation") throw new Exception($"Wrong target {server}/{name}");
        Check("CP-ENV", true, $"{server}/{name}; SPID={S<int>(db,"SELECT @@SPID")}");
        Check("CP-SCHEMA", S<int>(db,"SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=N'coach'")==10 &&
            S<int>(db,"SELECT COUNT(*) FROM dbo.__EFMigrationsHistory")>=12 &&
            S<int>(db,"SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1")==0 &&
            S<int>(db,"SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1")==0,
            "10 Coach tables, 12 migrations, zero disabled or untrusted FK/CHECK");
        var p1=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" owner"));
        var p2=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" other"));
        var prog1=Id(db,"INSERT coach.CoachProgram(OwnerPersonId,Title,Status) VALUES(@p,@n,N'Draft'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",p1),("@n",tag+" program A"));
        var prog2=Id(db,"INSERT coach.CoachProgram(OwnerPersonId,Title,Status) VALUES(@p,@n,N'Draft'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",p1),("@n",tag+" program B"));
        var group1=Id(db,"INSERT coach.OperationalGroup(ProgramId,Name,Status) VALUES(@p,@n,N'Open'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",prog1),("@n",tag+" group"));
        var rev1=Id(db,"INSERT coach.ProgramRevision(ProgramId,RevisionNo,Purpose,RuleRef,PublishedAtUtc) VALUES(@p,1,N'Purpose',N'validation',SYSUTCDATETIME()); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",prog1));
        var rev2=Id(db,"INSERT coach.ProgramRevision(ProgramId,RevisionNo,Purpose,RuleRef,PublishedAtUtc) VALUES(@p,1,N'Purpose',N'validation',SYSUTCDATETIME()); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",prog2));

        Expect("CP-PROGRAM-OWNER-FK",547,()=>N(db,"INSERT coach.ProgramGroupMembership(ProgramId,GroupId,PersonId,Status) VALUES(@p,@g,@person,N'Active')",("@p",prog2),("@g",group1),("@person",p1)),"FK_ProgramGroupMembership_Group_Program");
        N(db,"INSERT coach.ProgramGroupMembership(ProgramId,GroupId,PersonId,Status) VALUES(@p,@g,@person,N'Active')",("@p",prog1),("@g",group1),("@person",p1));
        Expect("CP-MEMBER-UNIQUE",2601,()=>N(db,"INSERT coach.ProgramGroupMembership(ProgramId,GroupId,PersonId,Status) VALUES(@p,@g,@person,N'Active')",("@p",prog1),("@g",group1),("@person",p1)));
        Expect("CP-MEMBER-STATUS",547,()=>N(db,"INSERT coach.ProgramGroupMembership(ProgramId,GroupId,PersonId,Status) VALUES(@p,@g,@person,N'Unknown')",("@p",prog1),("@g",group1),("@person",p2)),"CK_ProgramGroupMembership_Status");
        var initiative=S<long>(db,"SELECT TOP(1) m.InitiativeId FROM institution.InitiativeMembership m WHERE NOT EXISTS (SELECT 1 FROM coach.InitiativeGroupPlacement p WHERE p.MembershipId=m.Id AND p.EndedAtUtc IS NULL) ORDER BY m.Id");
        var igroup=Id(db,"INSERT coach.OperationalGroup(InitiativeId,Name,Status) VALUES(@i,@n,N'Open'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@i",initiative),("@n",tag+" initiative group"));
        Expect("CP-INVITE-KIND",58007,()=>N(db,"INSERT coach.ProgramGroupInvitation(GroupId,NormalizedEmail,TokenHash,Status,ExpiresAtUtc) VALUES(@g,@e,0x0102,N'Pending',DATEADD(day,1,SYSUTCDATETIME()))",("@g",igroup),("@e",tag+"@example.test")));
        N(db,"INSERT coach.ProgramGroupInvitation(GroupId,NormalizedEmail,TokenHash,Status,ExpiresAtUtc) VALUES(@g,@e,0x0102,N'Pending',DATEADD(day,1,SYSUTCDATETIME()))",("@g",group1),("@e",tag+"@example.test"));
        Expect("CP-INVITE-UNIQUE",2601,()=>N(db,"INSERT coach.ProgramGroupInvitation(GroupId,NormalizedEmail,TokenHash,Status,ExpiresAtUtc) VALUES(@g,@e,0x0102,N'Pending',DATEADD(day,1,SYSUTCDATETIME()))",("@g",group1),("@e",tag+"@example.test")));
        Expect("CP-ASSIGN-PARENT",58005,()=>N(db,"INSERT coach.GroupCoachAssignment(GroupId,CoachPersonId,InitiativeAppointmentId,AssignedByPersonId,FromUtc) VALUES(@g,@p,1,@p,SYSUTCDATETIME())",("@g",group1),("@p",p1)));
        var race=await Race(group1,p1);
        Check("CP-ASSIGN-RACE",race.Count(x=>x.error==0)==1 && race.Count(x=>x.error is 2601 or 2627)==1 && race[0].spid!=race[1].spid,
            $"SPIDs={string.Join(',',race.Select(x=>x.spid))}; errors={string.Join(',',race.Select(x=>x.error))}");
        Expect("CP-COMPLETION-REVISION",547,()=>N(db,"INSERT coach.ProgramCompletion(ProgramId,PersonId,ProgramRevisionId,Status,EvaluatorPersonId) VALUES(@p,@person,@r,N'Pending',@person)",("@p",prog1),("@person",p1),("@r",rev2)),"FK_ProgramCompletion_ProgramRevision_ProgramRevisionId_ProgramId");
        var ev=Id(db,"INSERT evidence.EvidenceEvent(SourceContext,SourceKey,SubjectPersonId,Kind,Provenance,SourceVersion,OccurredAtUtc,Validity) VALUES(N'coach',@key,@person,N'Completion',N'Validation',N'1',SYSUTCDATETIME(),N'Accepted'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@key",tag),("@person",p2));
        Expect("CP-EVIDENCE-OWNER",547,()=>N(db,"INSERT coach.ProgramCompletion(ProgramId,PersonId,ProgramRevisionId,Status,EvaluatorPersonId,EvidenceEventId) VALUES(@p,@person,@r,N'Completed',@person,@ev)",("@p",prog1),("@person",p1),("@r",rev1),("@ev",ev)),"FK_ProgramCompletion_EvidenceEvent_EvidenceEventId_PersonId");
        N(db,"INSERT coach.ProgramCompletion(ProgramId,PersonId,ProgramRevisionId,Status,EvaluatorPersonId) VALUES(@p,@person,@r,N'Pending',@person)",("@p",prog1),("@person",p1),("@r",rev1));
        Expect("CP-COMPLETION-UNIQUE",2601,()=>N(db,"INSERT coach.ProgramCompletion(ProgramId,PersonId,ProgramRevisionId,Status,EvaluatorPersonId) VALUES(@p,@person,@r,N'Pending',@person)",("@p",prog1),("@person",p1),("@r",rev1)));
        var member=S<long>(db,"SELECT TOP(1) m.Id FROM institution.InitiativeMembership m WHERE m.InitiativeId=@i AND NOT EXISTS (SELECT 1 FROM coach.InitiativeGroupPlacement p WHERE p.MembershipId=m.Id AND p.EndedAtUtc IS NULL) ORDER BY m.Id",("@i",initiative));
        Expect("CP-PLACEMENT-GROUP-OWNER",547,()=>N(db,"INSERT coach.InitiativeGroupPlacement(InitiativeId,GroupId,MembershipId,MovedByPersonId,StartedAtUtc) VALUES(@i,@g,@m,@p,SYSUTCDATETIME())",("@i",initiative),("@g",group1),("@m",member),("@p",p1)),"FK_InitiativeGroupPlacement_Group_Initiative");
        N(db,"INSERT coach.InitiativeGroupPlacement(InitiativeId,GroupId,MembershipId,MovedByPersonId,StartedAtUtc) VALUES(@i,@g,@m,@p,SYSUTCDATETIME())",("@i",initiative),("@g",igroup),("@m",member),("@p",p1));
        Check("CP-PRESERVATION",S<int>(db,"SELECT COUNT(*) FROM institution.Initiative")>0 && S<int>(db,"SELECT COUNT(*) FROM activity.PracticeAttempt")>0,
            "M1 and Activity fixture rows retained");
        Log("CP-SUMMARY",Failures==0?"PASS":"FAIL",$"failures={Failures}; fixtureTag={tag}");
    }

    private async Task<(int spid,int error)[]> Race(long group,long person)
    {
        using var gate=new Barrier(2);
        async Task<(int spid,int error)> Call()
        {
            using var db=Open();var spid=S<int>(db,"SELECT @@SPID");
            if(!gate.SignalAndWait(TimeSpan.FromSeconds(15)))throw new TimeoutException("assignment race timed out");
            try{N(db,"INSERT coach.GroupCoachAssignment(GroupId,CoachPersonId,AssignedByPersonId,FromUtc) VALUES(@g,@p,@p,SYSUTCDATETIME())",("@g",group),("@p",person));return(spid,0);}
            catch(SqlException e){return(spid,e.Number);}
        }
        return await Task.WhenAll(Task.Run(Call),Task.Run(Call));
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

