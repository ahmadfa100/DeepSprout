using System.Text.Json;
using Microsoft.Data.SqlClient;

internal sealed class CommercialValidation(string connectionString)
{
    private readonly string tag="commercial-"+Guid.NewGuid().ToString("N")[..10];
    public int Failures{get;private set;}
    public async Task Execute()
    {
        using var db=Open();
        var server=S<string>(db,"SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var name=S<string>(db,"SELECT DB_NAME()");
        if(server!="DESKTOP-A4AL2KR"||name!="DeepSprout_Validation")throw new Exception($"Wrong target {server}/{name}");
        Check("COM-ENV",true,$"{server}/{name}; SPID={S<int>(db,"SELECT @@SPID")}");
        Check("COM-SCHEMA",S<int>(db,"SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=N'commercial'")==5&&
            S<int>(db,"SELECT COUNT(*) FROM dbo.__EFMigrationsHistory")>=21&&
            S<int>(db,"SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1")==0&&
            S<int>(db,"SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1")==0,
            "5 Commercial tables, 21 migrations, trusted FK/CHECK");
        var person=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag));
        Expect("COM-PLAN-PRICE",547,()=>N(db,"INSERT commercial.PlanVersion(AudienceCode,PlanCode,VersionNo,Price,Currency) VALUES(N'Individual',@code,1,-1,'JOD')",("@code",tag)),"CK_PlanVersion_Price");
        var plan=Id(db,"INSERT commercial.PlanVersion(AudienceCode,PlanCode,VersionNo) VALUES(N'Individual',@code,1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@code",tag));
        Expect("COM-PLAN-IMMUTABLE",66001,()=>N(db,"UPDATE commercial.PlanVersion SET PlanCode=N'Tamper' WHERE Id=@plan",("@plan",plan)));
        Expect("COM-FEATURE-LIMIT",547,()=>N(db,"INSERT commercial.PlanFeature(PlanVersionId,FeatureCode,LimitValue) VALUES(@plan,N'Practice',0)",("@plan",plan)),"CK_PlanFeature_Limit");
        N(db,"INSERT commercial.PlanFeature(PlanVersionId,FeatureCode,LimitValue) VALUES(@plan,N'Practice',1)",("@plan",plan));
        Expect("COM-SUB-PAYER-XOR",547,()=>N(db,"INSERT commercial.Subscription(PlanVersionId,Status) VALUES(@plan,N'Proposed')",("@plan",plan)),"CK_Subscription_Payer");
        var sub=Id(db,"INSERT commercial.Subscription(PersonPayerId,PlanVersionId,Status) VALUES(@p,@plan,N'Proposed');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",person),("@plan",plan));
        Expect("COM-SUB-WINDOW",547,()=>N(db,"UPDATE commercial.Subscription SET StartsAtUtc=DATEADD(day,2,SYSUTCDATETIME()),EndsAtUtc=DATEADD(day,1,SYSUTCDATETIME()) WHERE Id=@sub",("@sub",sub)),"CK_Subscription_Window");
        Expect("COM-SUB-PAYER-IMMUTABLE",66003,()=>N(db,"UPDATE commercial.Subscription SET PersonPayerId=NULL,InstitutionPayerId=(SELECT TOP(1) Id FROM institution.Institution) WHERE Id=@sub",("@sub",sub)));
        Expect("COM-ALLOC-BENEFICIARY-XOR",547,()=>N(db,"INSERT commercial.EntitlementAllocation(SubscriptionId,FeatureCode,LimitValue) VALUES(@sub,N'Practice',1)",("@sub",sub)),"CK_EntitlementAllocation_Beneficiary");
        var allocation=Id(db,"INSERT commercial.EntitlementAllocation(SubscriptionId,PersonId,FeatureCode,LimitValue) VALUES(@sub,@p,N'Practice',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@sub",sub),("@p",person));
        Expect("COM-ALLOC-WINDOW",547,()=>N(db,"UPDATE commercial.EntitlementAllocation SET EffectiveFromUtc=DATEADD(day,2,SYSUTCDATETIME()),EffectiveToUtc=DATEADD(day,1,SYSUTCDATETIME()) WHERE Id=@a",("@a",allocation)),"CK_EntitlementAllocation_Window");
        var race=await Race(allocation);
        Check("COM-USAGE-RACE",race.Count(x=>x.error==0)==1&&race.Count(x=>x.error==66007)==1&&race[0].spid!=race[1].spid&&
            S<int>(db,"SELECT SUM(Quantity) FROM commercial.UsageLedger WHERE AllocationId=@a",("@a",allocation))==1,
            $"SPIDs={string.Join(',',race.Select(x=>x.spid))}; errors={string.Join(',',race.Select(x=>x.error))}");
        Expect("COM-DIRECT-OVERLIMIT",66007,()=>N(db,"INSERT commercial.UsageLedger(AllocationId,SourceKey,Quantity,RecordedAtUtc) VALUES(@a,@key,1,SYSUTCDATETIME())",("@a",allocation),("@key",tag+" direct")));
        Record(db,allocation,tag+" correction",-1);
        Check("COM-CORRECTION",S<int>(db,"SELECT SUM(Quantity) FROM commercial.UsageLedger WHERE AllocationId=@a",("@a",allocation))==0,"compensating quantity restored entitlement");
        Expect("COM-NEGATIVE-BALANCE",66007,()=>Record(db,allocation,tag+" too negative",-1));
        Record(db,allocation,tag+" reuse",1);
        Expect("COM-IDEMPOTENCY",2601,()=>Record(db,allocation,tag+" reuse",-1));
        Expect("COM-LEDGER-IMMUTABLE",66006,()=>N(db,"UPDATE commercial.UsageLedger SET Quantity=2 WHERE AllocationId=@a",("@a",allocation)));
        Check("COM-PRESERVATION",S<int>(db,"SELECT COUNT(*) FROM institution.InitiativeMembership")>0&&S<int>(db,"SELECT COUNT(*) FROM partnership.ProgramLink")>0,"M1 and Partnership rows retained");
        Log("COM-SUMMARY",Failures==0?"PASS":"FAIL",$"failures={Failures}; fixtureTag={tag}");
    }
    private static long Record(SqlConnection db,long allocation,string key,int qty)=>S<long>(db,"DECLARE @id bigint;EXEC commercial.RecordUsage @AllocationId=@a,@SourceKey=@key,@Quantity=@q,@EntryId=@id OUTPUT;SELECT @id",("@a",allocation),("@key",key),("@q",qty));
    private async Task<(int spid,int error)[]> Race(long allocation)
    {using var gate=new Barrier(2);async Task<(int spid,int error)> Call(string suffix){using var db=Open();var spid=S<int>(db,"SELECT @@SPID");if(!gate.SignalAndWait(TimeSpan.FromSeconds(15)))throw new TimeoutException("entitlement race timed out");
        try{Record(db,allocation,tag+suffix,1);return(spid,0);}catch(SqlException e){return(spid,e.Number);}}
        return await Task.WhenAll(Task.Run(()=>Call(" A")),Task.Run(()=>Call(" B")));}
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

