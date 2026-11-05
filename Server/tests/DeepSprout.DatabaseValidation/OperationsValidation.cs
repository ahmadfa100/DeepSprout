using System.Data;
using System.Text.Json;
using Microsoft.Data.SqlClient;

internal sealed class OperationsValidation(string connectionString)
{
    private readonly string tag = "ops-" + Guid.NewGuid().ToString("N")[..10];
    public int Failures { get; private set; }
    public async Task Execute()
    {
        using var db=Open();
        var server=S<string>(db,"SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var name=S<string>(db,"SELECT DB_NAME()");
        if(server!="DESKTOP-A4AL2KR"||name!="DeepSprout_Validation")throw new Exception($"Wrong target {server}/{name}");
        Check("OPS-ENV",true,$"{server}/{name}; SPID={S<int>(db,"SELECT @@SPID")}");
        Check("OPS-SCHEMA",S<int>(db,"SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=N'governance'")==2 &&
            S<int>(db,"SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=N'ops'")==5 &&
            S<int>(db,"SELECT COUNT(*) FROM dbo.__EFMigrationsHistory")>=7 &&
            S<int>(db,"SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1")==0 &&
            S<int>(db,"SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1")==0,
            "2 governance and 5 ops tables including M1 audit; 7 migrations; all constraints trusted");
        var person=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) OUTPUT INSERTED.Id VALUES(@name,N'Active',1)",("@name",tag));
        var release=Id(db,"INSERT governance.ContentRelease(TargetCode,VersionNo,PayloadRef,PublishedByPersonId,PublishedAtUtc) OUTPUT INSERTED.Id VALUES(@code,1,N'payload-ref',@person,SYSUTCDATETIME())",("@code",tag),("@person",person));
        Expect("GOV-RELEASE-UNIQUE",2601,()=>N(db,"INSERT governance.ContentRelease(TargetCode,VersionNo,PayloadRef,PublishedByPersonId,PublishedAtUtc) VALUES(@code,1,N'other',@person,SYSUTCDATETIME())",("@code",tag),("@person",person)));
        Expect("GOV-RELEASE-IMMUTABLE",54001,()=>N(db,"UPDATE governance.ContentRelease SET PayloadRef=N'tamper' WHERE Id=@id",("@id",release)));
        var action=Id(db,"INSERT governance.GovernanceAction(ActorPersonId,ActionCode,ResourceType,ResourcePublicId,Reason,AtUtc) OUTPUT INSERTED.Id VALUES(@person,N'Test',N'Fixture',NEWID(),N'Validation reason',SYSUTCDATETIME())",("@person",person));
        Expect("GOV-ACTION-IMMUTABLE",54002,()=>N(db,"DELETE governance.GovernanceAction WHERE Id=@id",("@id",action)));
        var eventId=Guid.NewGuid();
        var outbox=Id(db,"INSERT ops.OutboxMessage(EventPublicId,EventType,PayloadRef,OccurredAtUtc,Status,Attempts) OUTPUT INSERTED.Id VALUES(@event,N'Validation',N'payload-ref',SYSUTCDATETIME(),N'Pending',0)",("@event",eventId));
        Expect("OPS-OUTBOX-ATTEMPTS",547,()=>N(db,"UPDATE ops.OutboxMessage SET Attempts=-1 WHERE Id=@id",("@id",outbox)),"CK_OutboxMessage_Attempts");
        N(db,"UPDATE ops.OutboxMessage SET Status=N'Delivered' WHERE Id=@id",("@id",outbox));
        Expect("OPS-OUTBOX-TERMINAL",54004,()=>N(db,"UPDATE ops.OutboxMessage SET Status=N'Pending' WHERE Id=@id",("@id",outbox)));
        var notification=Id(db,"INSERT ops.Notification(RecipientPersonId,EventPublicId,ResourceKind,ResourcePublicId,TemplateCode,Status) OUTPUT INSERTED.Id VALUES(@person,@event,N'Fixture',NEWID(),N'notice',N'Pending')",("@person",person),("@event",eventId));
        Expect("OPS-NOTIFICATION-UNIQUE",2601,()=>N(db,"INSERT ops.Notification(RecipientPersonId,EventPublicId,ResourceKind,ResourcePublicId,TemplateCode,Status) VALUES(@person,@event,N'Fixture',NEWID(),N'notice',N'Pending')",("@person",person),("@event",eventId)));
        var delivery=Id(db,"INSERT ops.DeliveryAttempt(NotificationId,Channel,Outcome,AttemptedAtUtc) OUTPUT INSERTED.Id VALUES(@id,N'Email',N'Attempted',SYSUTCDATETIME())",("@id",notification));
        Expect("OPS-DELIVERY-IMMUTABLE",54003,()=>N(db,"UPDATE ops.DeliveryAttempt SET Outcome=N'Sent' WHERE Id=@id",("@id",delivery)));
        Expect("OPS-IDEMPOTENCY-HASH",547,()=>N(db,"INSERT ops.IdempotencyRecord(ActorPersonId,CommandCode,IdempotencyKey,RequestHash,Status,ExpiresAtUtc) VALUES(@person,N'Fixture',N'bad',0xAA,N'InProgress',DATEADD(day,1,SYSUTCDATETIME()))",("@person",person)),"CK_IdempotencyRecord_Hash");
        var race=await Race(person);
        Check("OPS-IDEMPOTENCY-RACE",race.Count(x=>x.error==0)==1&&race.Count(x=>x.error is 2601 or 2627)==1&&
            S<int>(db,"SELECT COUNT(*) FROM ops.IdempotencyRecord WHERE ActorPersonId=@person AND CommandCode=N'Fixture' AND IdempotencyKey=@key",("@person",person),("@key",tag))==1,
            $"SPIDs={string.Join(',',race.Select(x=>x.spid))}; errors={string.Join(',',race.Select(x=>x.error))}; one command key");
        Check("OPS-DATA-PRESERVED",S<int>(db,"SELECT COUNT(*) FROM institution.Initiative")>0&&S<int>(db,"SELECT COUNT(*) FROM lab.AssessmentAttempt")>0&&S<int>(db,"SELECT COUNT(*) FROM shield.BrowserUsagePeriod")>0,
            "M1, Lab and Shield data remained present");
        Log("OPS-SUMMARY",Failures==0?"PASS":"FAIL",$"failures={Failures}; fixtureTag={tag}");
    }
    private async Task<(int spid,int error)[]> Race(long person)
    {
        using var gate=new Barrier(2);
        async Task<(int spid,int error)> Call()
        {
            using var db=Open();var spid=S<int>(db,"SELECT @@SPID");
            if(!gate.SignalAndWait(TimeSpan.FromSeconds(15)))throw new TimeoutException("Operations race barrier timed out");
            try{N(db,"INSERT ops.IdempotencyRecord(ActorPersonId,CommandCode,IdempotencyKey,RequestHash,Status,ExpiresAtUtc) VALUES(@person,N'Fixture',@key,@hash,N'InProgress',DATEADD(day,1,SYSUTCDATETIME()))",("@person",person),("@key",tag),("@hash",new byte[32]));return(spid,0);}
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

