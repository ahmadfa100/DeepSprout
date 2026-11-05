using System.Text.Json;
using Microsoft.Data.SqlClient;

internal sealed class EvidenceValidation(string connectionString)
{
    private readonly string tag="evidence-"+Guid.NewGuid().ToString("N")[..10];
    public int Failures{get;private set;}
    public async Task Execute()
    {
        using var db=Open();
        var server=S<string>(db,"SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var name=S<string>(db,"SELECT DB_NAME()");
        if(server!="DESKTOP-A4AL2KR"||name!="DeepSprout_Validation")throw new Exception($"Wrong target {server}/{name}");
        Check("EVIDENCE-ENV",true,$"{server}/{name}; SPID={S<int>(db,"SELECT @@SPID")}");
        Check("EVIDENCE-SCHEMA",S<int>(db,"SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=N'evidence'")==5&&
            S<int>(db,"SELECT COUNT(*) FROM dbo.__EFMigrationsHistory")>=10&&
            S<int>(db,"SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1")==0&&
            S<int>(db,"SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1")==0,
            "5 Evidence tables, 10 migrations, all FK/CHECK trusted");
        var p1=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) OUTPUT INSERTED.Id VALUES(@name,N'Active',1)",("@name",tag+" owner"));
        var p2=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) OUTPUT INSERTED.Id VALUES(@name,N'Active',1)",("@name",tag+" other"));
        var source=NewEvent(db,p1,"source",null,"Accepted");
        Expect("EVIDENCE-CORRECTION-OWNER",547,()=>NewEvent(db,p2,"wrong-owner",source,"Invalidates"),"FK_EvidenceEvent_EvidenceEvent_InvalidatesEventId_SubjectPersonId");
        var correction=NewEvent(db,p1,"correction",source,"Invalidates");
        Expect("EVIDENCE-CORRECTION-UNIQUE",2601,()=>NewEvent(db,p1,"duplicate-correction",source,"Invalidates"));
        Expect("EVIDENCE-CORRECTION-CHAIN",56002,()=>NewEvent(db,p1,"correction-chain",correction,"Invalidates"));
        Expect("EVIDENCE-IMMUTABLE",56001,()=>N(db,"UPDATE evidence.EvidenceEvent SET SourceKey=N'tamper' WHERE Id=@id",("@id",source)));
        var policy1=Id(db,"INSERT evidence.RewardPolicyVersion(PolicyCode,VersionNo,RuleRef,PublishedAtUtc) VALUES(@code,1,N'policy-ref',SYSUTCDATETIME()); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@code",tag));
        var policy2=Id(db,"INSERT evidence.RewardPolicyVersion(PolicyCode,VersionNo,RuleRef,PublishedAtUtc) VALUES(@code,2,N'policy-ref-2',SYSUTCDATETIME()); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@code",tag));
        Expect("EVIDENCE-POLICY-IMMUTABLE",56003,()=>N(db,"UPDATE evidence.RewardPolicyVersion SET RuleRef=N'tamper' WHERE Id=@id",("@id",policy1)));
        Expect("EVIDENCE-REWARD-OWNER",547,()=>N(db,"INSERT evidence.PersonalRewardEntry(EvidenceEventId,PersonId,PolicyVersionId,EffectCode,EntryKind,Units,DecidedAtUtc) VALUES(@event,@person,@policy,N'tree',N'Grant',1,SYSUTCDATETIME())",("@event",source),("@person",p2),("@policy",policy1)),"FK_PersonalRewardEntry_EvidenceEvent_EvidenceEventId_PersonId");
        var race=await Race(source,p1,policy1,policy2);
        Check("EVIDENCE-GRANT-RACE",race.Count(x=>x.error==0)==1&&race.Count(x=>x.error is 2601 or 2627)==1&&
            S<int>(db,"SELECT COUNT(*) FROM evidence.PersonalRewardEntry WHERE EvidenceEventId=@event AND PersonId=@person AND EffectCode=N'tree' AND EntryKind=N'Grant'",("@event",source),("@person",p1))==1,
            $"SPIDs={string.Join(',',race.Select(x=>x.spid))}; errors={string.Join(',',race.Select(x=>x.error))}; policy version does not duplicate grant");
        var grant=S<long>(db,"SELECT Id FROM evidence.PersonalRewardEntry WHERE EvidenceEventId=@event AND PersonId=@person AND EntryKind=N'Grant'",("@event",source),("@person",p1));
        Expect("EVIDENCE-GRANT-IMMUTABLE",56004,()=>N(db,"UPDATE evidence.PersonalRewardEntry SET Units=9 WHERE Id=@id",("@id",grant)));
        var reversal=Id(db,"INSERT evidence.PersonalRewardEntry(EvidenceEventId,PersonId,PolicyVersionId,EffectCode,EntryKind,Units,ReversesEntryId,DecidedAtUtc) VALUES(@event,@person,@policy,N'tree',N'Reversal',-1,@grant,SYSUTCDATETIME()); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@event",correction),("@person",p1),("@policy",policy1),("@grant",grant));
        Expect("EVIDENCE-REVERSAL-UNIQUE",2601,()=>N(db,"INSERT evidence.PersonalRewardEntry(EvidenceEventId,PersonId,PolicyVersionId,EffectCode,EntryKind,Units,ReversesEntryId,DecidedAtUtc) VALUES(@event,@person,@policy,N'tree',N'Reversal',-1,@grant,SYSUTCDATETIME())",("@event",correction),("@person",p1),("@policy",policy1),("@grant",grant)));
        Expect("EVIDENCE-REVERSAL-CHAIN",56005,()=>N(db,"INSERT evidence.PersonalRewardEntry(EvidenceEventId,PersonId,PolicyVersionId,EffectCode,EntryKind,Units,ReversesEntryId,DecidedAtUtc) VALUES(@event,@person,@policy,N'tree',N'Reversal',-1,@reversal,SYSUTCDATETIME())",("@event",correction),("@person",p1),("@policy",policy1),("@reversal",reversal)));
        var program1=Id(db,"INSERT coach.CoachProgram(OwnerPersonId,Title,Status) VALUES(@p,N'Garden Program',N'Draft'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",p1));
        var program2=Id(db,"INSERT coach.CoachProgram(OwnerPersonId,Title,Status) VALUES(@p,N'Other Program',N'Draft'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",p2));
        var group=Id(db,"INSERT coach.OperationalGroup(ProgramId,Name,Status) VALUES(@program,N'Garden Group',N'Open'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@program",program1));
        Expect("EVIDENCE-GARDEN-OWNER",547,()=>N(db,"INSERT evidence.GroupGarden(IndependentGroupId,ProgramId,Status) VALUES(@group,@wrong,N'Active')",("@group",group),("@wrong",program2)),"FK_GroupGarden_OperationalGroup_IndependentGroupId_ProgramId");
        var garden=Id(db,"INSERT evidence.GroupGarden(IndependentGroupId,ProgramId,Status) VALUES(@group,@program,N'Active'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@group",group),("@program",program1));
        Expect("EVIDENCE-GARDEN-XOR",547,()=>N(db,"INSERT evidence.GroupGarden(Status) VALUES(N'Active')"),"CK_GroupGarden_Owner");
        Expect("EVIDENCE-GARDEN-IMMUTABLE",56008,()=>N(db,"UPDATE evidence.GroupGarden SET IndependentGroupId=NULL,ProgramId=NULL,InitiativeId=(SELECT TOP(1) Id FROM institution.Initiative) WHERE Id=@id",("@id",garden)));
        var groupGrant=Id(db,"INSERT evidence.GroupRewardEntry(EvidenceEventId,GroupGardenId,PolicyVersionId,EffectCode,EntryKind,Units,DecidedAtUtc) VALUES(@event,@garden,@policy,N'growth',N'Grant',1,SYSUTCDATETIME()); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@event",source),("@garden",garden),("@policy",policy1));
        Expect("EVIDENCE-GROUP-GRANT-UNIQUE",2601,()=>N(db,"INSERT evidence.GroupRewardEntry(EvidenceEventId,GroupGardenId,PolicyVersionId,EffectCode,EntryKind,Units,DecidedAtUtc) VALUES(@event,@garden,@policy,N'growth',N'Grant',1,SYSUTCDATETIME())",("@event",source),("@garden",garden),("@policy",policy2)));
        Expect("EVIDENCE-GROUP-IMMUTABLE",56006,()=>N(db,"UPDATE evidence.GroupRewardEntry SET Units=2 WHERE Id=@id",("@id",groupGrant)));
        Check("EVIDENCE-PRESERVATION",S<int>(db,"SELECT COUNT(*) FROM institution.Initiative")>0&&S<int>(db,"SELECT COUNT(*) FROM lab.AssessmentAttempt")>0&&S<int>(db,"SELECT COUNT(*) FROM shield.BrowserUsagePeriod")>0&&
            S<int>(db,"SELECT COUNT(*) FROM coach.CoachProgram")>0,
            "M1, Lab, Shield and Coach data retained");
        Log("EVIDENCE-SUMMARY",Failures==0?"PASS":"FAIL",$"failures={Failures}; fixtureTag={tag}");
    }
    private long NewEvent(SqlConnection db,long person,string source,long? invalidates,string validity)=>
        Id(db,"INSERT evidence.EvidenceEvent(SourceContext,SourceKey,SubjectPersonId,Kind,Provenance,SourceVersion,OccurredAtUtc,Validity,InvalidatesEventId) VALUES(N'Validation',@key,@person,N'Practice',N'Fixture',N'v1',SYSUTCDATETIME(),@validity,@prior); SELECT CAST(SCOPE_IDENTITY() AS bigint)",
            ("@key",tag+"-"+source),("@person",person),("@validity",validity),("@prior",invalidates));
    private async Task<(int spid,int error)[]> Race(long source,long person,long policy1,long policy2)
    {
        using var gate=new Barrier(2);
        async Task<(int spid,int error)> Call(long policy)
        {using var db=Open();var spid=S<int>(db,"SELECT @@SPID");if(!gate.SignalAndWait(TimeSpan.FromSeconds(15)))throw new TimeoutException("Reward race barrier timed out");
         try{N(db,"INSERT evidence.PersonalRewardEntry(EvidenceEventId,PersonId,PolicyVersionId,EffectCode,EntryKind,Units,DecidedAtUtc) VALUES(@event,@person,@policy,N'tree',N'Grant',1,SYSUTCDATETIME())",("@event",source),("@person",person),("@policy",policy));return(spid,0);}
         catch(SqlException e){return(spid,e.Number);}}
        return await Task.WhenAll(Task.Run(()=>Call(policy1)),Task.Run(()=>Call(policy2)));
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

