using System.Text.Json;
using DeepSprout.Domain;
using DeepSprout.Infrastructure;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

internal sealed class CoachFoundationValidation(string connectionString)
{
    private readonly string tag="coach-"+Guid.NewGuid().ToString("N")[..10];
    public int Failures{get;private set;}
    public async Task Execute()
    {
        using var db=Open();
        var server=S<string>(db,"SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var name=S<string>(db,"SELECT DB_NAME()");
        if(server!="DESKTOP-A4AL2KR"||name!="DeepSprout_Validation")throw new Exception($"Wrong target {server}/{name}");
        Check("COACH-ENV",true,$"{server}/{name}; SPID={S<int>(db,"SELECT @@SPID")}");
        Check("COACH-SCHEMA",S<int>(db,"SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=N'coach'")>=5&&
            S<int>(db,"SELECT COUNT(*) FROM dbo.__EFMigrationsHistory")>=9&&
            S<int>(db,"SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1")==0&&
            S<int>(db,"SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1")==0,
            "5 Coach foundation tables, 9 migrations, all FK/CHECK trusted");
        var p1=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) OUTPUT INSERTED.Id VALUES(@name,N'Active',1)",("@name",tag+" owner"));
        var p2=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) OUTPUT INSERTED.Id VALUES(@name,N'Active',1)",("@name",tag+" other"));
        Expect("COACH-APPROVAL-STATUS",547,()=>N(db,"INSERT coach.CoachApproval(PersonId,Status) VALUES(@p,N'Unknown')",("@p",p1)),"CK_CoachApproval_Status");
        N(db,"INSERT coach.CoachApproval(PersonId,Status) VALUES(@p,N'Approved')",("@p",p1));
        var program=Id(db,"INSERT coach.CoachProgram(OwnerPersonId,Title,Status) VALUES(@p,N'Validation Program',N'Draft'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",p1));
        Expect("COACH-PUBLISH-GUARD",55002,()=>N(db,"UPDATE coach.CoachProgram SET Status=N'Published' WHERE Id=@id",("@id",program)));
        var race=await Race(program);
        Check("COACH-REVISION-RACE",race.Count(x=>x.error==0)==1&&race.Count(x=>x.error is 2601 or 2627)==1&&
            S<int>(db,"SELECT COUNT(*) FROM coach.ProgramRevision WHERE ProgramId=@id AND RevisionNo=1",("@id",program))==1,
            $"SPIDs={string.Join(',',race.Select(x=>x.spid))}; errors={string.Join(',',race.Select(x=>x.error))}");
        var revision=S<long>(db,"SELECT Id FROM coach.ProgramRevision WHERE ProgramId=@id",("@id",program));
        Expect("COACH-STAGE-TIMES",547,()=>N(db,"INSERT coach.ProgramStage(ProgramRevisionId,StageNo,Title,StartsAtUtc,EndsAtUtc) VALUES(@id,1,N'Bad',DATEADD(hour,1,SYSUTCDATETIME()),SYSUTCDATETIME())",("@id",revision)),"CK_ProgramStage_Times");
        var stage=Id(db,"INSERT coach.ProgramStage(ProgramRevisionId,StageNo,Title) VALUES(@id,1,N'Stage one'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@id",revision));
        Expect("COACH-STAGE-IMMUTABLE",55004,()=>N(db,"UPDATE coach.ProgramStage SET Title=N'Tamper' WHERE Id=@id",("@id",stage)));
        Expect("COACH-REVISION-IMMUTABLE",55003,()=>N(db,"UPDATE coach.ProgramRevision SET Purpose=N'Tamper' WHERE Id=@id",("@id",revision)));
        N(db,"UPDATE coach.CoachProgram SET Status=N'Published' WHERE Id=@id",("@id",program));
        Expect("COACH-STAGE-SEALED",55005,()=>N(db,"INSERT coach.ProgramStage(ProgramRevisionId,StageNo,Title) VALUES(@id,2,N'Late')",("@id",revision)));
        Expect("COACH-OWNER-IMMUTABLE",55001,()=>N(db,"UPDATE coach.CoachProgram SET OwnerPersonId=@other WHERE Id=@id",("@other",p2),("@id",program)));
        Expect("COACH-GROUP-XOR",547,()=>N(db,"INSERT coach.OperationalGroup(InitiativeId,ProgramId,Name,Status) VALUES(NULL,NULL,N'Bad',N'Open')"),"CK_OperationalGroup_Parent");
        var group=Id(db,"INSERT coach.OperationalGroup(ProgramId,Name,Status) VALUES(@program,N'Program Group',N'Open'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@program",program));
        Check("COACH-GROUP-NULLABLE",S<int>(db,"SELECT COUNT(*) FROM coach.OperationalGroup WHERE Id=@id AND InitiativeId IS NULL AND ProgramId=@program",("@id",group),("@program",program))==1,
            "nullable parent and XOR hold for Program group");
        Expect("COACH-GROUP-PARENT-IMMUTABLE",55006,()=>N(db,"UPDATE coach.OperationalGroup SET ProgramId=NULL,InitiativeId=(SELECT TOP(1) Id FROM institution.Initiative) WHERE Id=@id",("@id",group)));
        using (var context = new DeepSproutDbContext(new DbContextOptionsBuilder<DeepSproutDbContext>()
            .UseSqlServer(connectionString).Options))
        {
            var efProgram = new CoachProgram { OwnerPersonId = p1, Title = "EF trigger fixture", Status = "Draft" };
            context.Add(efProgram);
            context.SaveChanges();
            var efGroup = new OperationalGroup { ProgramId = efProgram.Id, Name = "EF group", Status = "Open" };
            context.Add(efGroup);
            context.SaveChanges();
            Check("COACH-EF-OUTPUT", efProgram.Id > 0 && efGroup.Id > 0 &&
                S<int>(db,"SELECT COUNT(*) FROM coach.OperationalGroup WHERE Id=@id AND ProgramId=@program",("@id",efGroup.Id),("@program",efProgram.Id))==1,
                "EF Core inserted triggered Program and Group with generated IDs");
        }
        Check("COACH-M1-PRESERVATION",S<int>(db,"SELECT COUNT(*) FROM institution.Initiative")>0&&
            S<int>(db,"SELECT COUNT(*) FROM lab.AssessmentAttempt")>0&&
            S<int>(db,"SELECT COUNT(*) FROM shield.BrowserUsagePeriod")>0,
            "M1, Lab, and Shield rows remain present");
        Log("COACH-SUMMARY",Failures==0?"PASS":"FAIL",$"failures={Failures}; fixtureTag={tag}");
    }
    private async Task<(int spid,int error)[]> Race(long program)
    {
        using var gate=new Barrier(2);
        async Task<(int spid,int error)> Call()
        {
            using var db=Open();var spid=S<int>(db,"SELECT @@SPID");
            if(!gate.SignalAndWait(TimeSpan.FromSeconds(15)))throw new TimeoutException("Coach race barrier timed out");
            try{N(db,"INSERT coach.ProgramRevision(ProgramId,RevisionNo,Purpose,RuleRef,PublishedAtUtc) VALUES(@id,1,N'Validation',N'rule-ref',SYSUTCDATETIME())",("@id",program));return(spid,0);}
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

