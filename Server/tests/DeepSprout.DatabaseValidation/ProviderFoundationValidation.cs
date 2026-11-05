using System.Text.Json;
using Microsoft.Data.SqlClient;

internal sealed class ProviderFoundationValidation(string connectionString)
{
    private readonly string tag="provider-"+Guid.NewGuid().ToString("N")[..10];
    public int Failures{get;private set;}
    public async Task Execute()
    {
        using var db=Open();
        var server=S<string>(db,"SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var name=S<string>(db,"SELECT DB_NAME()");
        if(server!="DESKTOP-A4AL2KR"||name!="DeepSprout_Validation")throw new Exception($"Wrong target {server}/{name}");
        Check("PROV-ENV",true,$"{server}/{name}; SPID={S<int>(db,"SELECT @@SPID")}");
        Check("PROV-SCHEMA",S<int>(db,"SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=N'provider'")>=8&&
            S<int>(db,"SELECT COUNT(*) FROM dbo.__EFMigrationsHistory")>=16&&
            S<int>(db,"SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1")==0&&
            S<int>(db,"SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1")==0,
            "8 provider foundation tables, 16 migrations, all FK/CHECK trusted");
        var p1=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" p1"));
        var p2=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" p2"));
        var p3=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" p3"));
        var p4=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" p4"));
        var provider=Id(db,"INSERT provider.Provider(Name,Status,CountryCode) VALUES(@n,N'Approved','JO');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag));
        N(db,"INSERT provider.ProviderMembership(ProviderId,PersonId,Role,Status) VALUES(@provider,@p,N'Owner',N'Active')",("@provider",provider),("@p",p1));
        Expect("PROV-MEMBERSHIP-UNIQUE",2601,()=>N(db,"INSERT provider.ProviderMembership(ProviderId,PersonId,Role,Status) VALUES(@provider,@p,N'Owner',N'Active')",("@provider",provider),("@p",p1)));
        var exp=Id(db,"INSERT provider.Experience(ProviderId,Kind,Title,Status,Capacity,TimeZoneId,StartAtUtc,EndAtUtc) VALUES(@provider,N'Camp',@n,N'Draft',1,N'UTC',DATEADD(day,1,SYSUTCDATETIME()),DATEADD(day,2,SYSUTCDATETIME()));SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@provider",provider),("@n",tag));
        Expect("PROV-EXPERIENCE-TIMES",547,()=>N(db,"INSERT provider.Experience(ProviderId,Kind,Title,Status,Capacity,TimeZoneId,StartAtUtc,EndAtUtc) VALUES(@provider,N'Camp',N'Bad',N'Draft',1,N'UTC',DATEADD(day,2,SYSUTCDATETIME()),DATEADD(day,1,SYSUTCDATETIME()))",("@provider",provider)),"CK_Experience_CapacityTimes");
        var rev=Id(db,"INSERT provider.ExperienceRevision(ExperienceId,RevisionNo,Venue,SafetyRef,ConsentVersion,CostKind,CompletionRuleRef,PublishedAtUtc) VALUES(@exp,1,N'Venue',N'Safety',N'1',N'Free',N'Rule',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@exp",exp));
        Expect("PROV-REV-COST",547,()=>N(db,"INSERT provider.ExperienceRevision(ExperienceId,RevisionNo,Venue,SafetyRef,ConsentVersion,CostKind,Price,Currency,CompletionRuleRef,PublishedAtUtc) VALUES(@exp,2,N'Venue',N'Safety',N'1',N'Paid',NULL,NULL,N'Rule',SYSUTCDATETIME())",("@exp",exp)),"CK_ExperienceRevision_Cost");
        Expect("PROV-REV-IMMUTABLE",62001,()=>N(db,"UPDATE provider.ExperienceRevision SET Venue=N'Tamper' WHERE Id=@rev",("@rev",rev)));
        Expect("PROV-DRAFT-BOOK",62007,()=>Book(db,exp,p1));
        N(db,"UPDATE provider.Experience SET Status=N'Published' WHERE Id=@exp",("@exp",exp));
        var race=await Race(exp,p1,p2);
        Check("PROV-BOOK-RACE",race.Count(x=>x.error==0)==1&&race.Count(x=>x.error==62005)==1&&race[0].spid!=race[1].spid&&
            S<int>(db,"SELECT COUNT(*) FROM provider.ExperienceBooking WHERE ExperienceId=@exp AND Status=N'Confirmed'",("@exp",exp))==1,
            $"SPIDs={string.Join(',',race.Select(x=>x.spid))}; errors={string.Join(',',race.Select(x=>x.error))}");
        Expect("PROV-DIRECT-CAPACITY",62005,()=>N(db,"INSERT provider.ExperienceBooking(ExperienceId,PersonId,RevisionId,Status,Mode,BookedAtUtc) VALUES(@exp,@p,@rev,N'Confirmed',N'Onsite',SYSUTCDATETIME())",("@exp",exp),("@p",p3),("@rev",rev)));
        var exp2=Id(db,"INSERT provider.Experience(ProviderId,Kind,Title,Status,Capacity,TimeZoneId,StartAtUtc,EndAtUtc) VALUES(@provider,N'Camp',@n,N'Published',1,N'UTC',DATEADD(day,1,SYSUTCDATETIME()),DATEADD(day,2,SYSUTCDATETIME()));SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@provider",provider),("@n",tag+" second"));
        var rev2=Id(db,"INSERT provider.ExperienceRevision(ExperienceId,RevisionNo,Venue,SafetyRef,ConsentVersion,CostKind,CompletionRuleRef,PublishedAtUtc) VALUES(@exp,1,N'Venue',N'Safety',N'1',N'Free',N'Rule',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@exp",exp2));
        Expect("PROV-REV-OWNER",547,()=>N(db,"INSERT provider.ExperienceBooking(ExperienceId,PersonId,RevisionId,Status,Mode,BookedAtUtc) VALUES(@exp,@p,@rev,N'Queued',N'Onsite',SYSUTCDATETIME())",("@exp",exp2),("@p",p3),("@rev",rev)),"FK_ExperienceBooking_ExperienceRevision_RevisionId_ExperienceId");
        var queued=Id(db,"INSERT provider.ExperienceBooking(ExperienceId,PersonId,RevisionId,Status,Mode,BookedAtUtc) VALUES(@exp,@p,@rev,N'Queued',N'Onsite',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@exp",exp2),("@p",p3),("@rev",rev2));
        var offer=Id(db,"INSERT provider.SeatOffer(ExperienceId,BookingId,Status,OfferedAtUtc,ExpiresAtUtc) VALUES(@exp,@b,N'Offered',SYSUTCDATETIME(),DATEADD(hour,1,SYSUTCDATETIME()));SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@exp",exp2),("@b",queued));
        Expect("PROV-OFFER-HOLDS",62005,()=>Book(db,exp2,p4));
        Expect("PROV-OFFER-UNIQUE",2601,()=>N(db,"INSERT provider.SeatOffer(ExperienceId,BookingId,Status,OfferedAtUtc,ExpiresAtUtc) VALUES(@exp,@b,N'Offered',SYSUTCDATETIME(),DATEADD(hour,1,SYSUTCDATETIME()))",("@exp",exp2),("@b",queued)));
        N(db,"UPDATE provider.SeatOffer SET Status=N'Expired',DecisionAtUtc=SYSUTCDATETIME() WHERE Id=@offer",("@offer",offer));
        Check("PROV-OFFER-RELEASE",Book(db,exp2,p4)>0,"expired offer releases held seat");
        Check("PROV-PRESERVATION",S<int>(db,"SELECT COUNT(*) FROM institution.Initiative")>0&&S<int>(db,"SELECT COUNT(*) FROM session.Session")>0,"M1 and Session rows retained");
        Log("PROV-SUMMARY",Failures==0?"PASS":"FAIL",$"failures={Failures}; fixtureTag={tag}");
    }
    private static long Book(SqlConnection db,long exp,long person)=>S<long>(db,"DECLARE @id bigint;EXEC provider.BookConfirmed @ExperienceId=@exp,@PersonId=@p,@Mode=N'Onsite',@BookingId=@id OUTPUT;SELECT @id",("@exp",exp),("@p",person));
    private async Task<(int spid,int error)[]> Race(long exp,long p1,long p2)
    {
        using var gate=new Barrier(2);
        async Task<(int spid,int error)> Call(long person)
        {using var db=Open();var spid=S<int>(db,"SELECT @@SPID");if(!gate.SignalAndWait(TimeSpan.FromSeconds(15)))throw new TimeoutException("provider race timed out");
            try{Book(db,exp,person);return(spid,0);}catch(SqlException e){return(spid,e.Number);}}
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

