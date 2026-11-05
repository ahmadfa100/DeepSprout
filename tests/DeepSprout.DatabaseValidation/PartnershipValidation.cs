using System.Text.Json;
using Microsoft.Data.SqlClient;

internal sealed class PartnershipValidation(string connectionString)
{
    private readonly string tag="partner-"+Guid.NewGuid().ToString("N")[..10];
    public int Failures{get;private set;}
    public async Task Execute()
    {
        using var db=Open();
        var server=S<string>(db,"SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var name=S<string>(db,"SELECT DB_NAME()");
        if(server!="DESKTOP-A4AL2KR"||name!="DeepSprout_Validation")throw new Exception($"Wrong target {server}/{name}");
        Check("PART-ENV",true,$"{server}/{name}; SPID={S<int>(db,"SELECT @@SPID")}");
        Check("PART-SCHEMA",S<int>(db,"SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=N'partnership'")==2&&
            S<int>(db,"SELECT COUNT(*) FROM dbo.__EFMigrationsHistory")>=20&&
            S<int>(db,"SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1")==0&&
            S<int>(db,"SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1")==0,
            "2 Partnership tables, 20 migrations, trusted FK/CHECK");
        var owner=Person(db,"program owner");var outsider=Person(db,"outsider");var providerMember=Person(db,"provider member");
        var initiative=S<long>(db,"SELECT TOP(1) Id FROM institution.Initiative ORDER BY Id");
        var program=Id(db,"INSERT coach.CoachProgram(OwnerPersonId,Title,Status) VALUES(@p,@n,N'Draft');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",owner),("@n",tag));
        var link=Id(db,"INSERT partnership.ProgramLink(InitiativeId,ProgramId,RequestedByPersonId,ScopeVersion,Status) VALUES(@i,@p,@actor,N'1',N'Requested');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@i",initiative),("@p",program),("@actor",outsider));
        Expect("PART-PROGRAM-ACCEPTED-BY",547,()=>N(db,"UPDATE partnership.ProgramLink SET Status=N'Accepted' WHERE Id=@id",("@id",link)),"CK_ProgramLink_AcceptedBy");
        Expect("PART-PROGRAM-OWNER",65002,()=>N(db,"UPDATE partnership.ProgramLink SET Status=N'Accepted',AcceptedByPersonId=@actor WHERE Id=@id",("@actor",outsider),("@id",link)));
        N(db,"UPDATE partnership.ProgramLink SET Status=N'Accepted',AcceptedByPersonId=@actor WHERE Id=@id",("@actor",owner),("@id",link));
        Expect("PART-PROGRAM-ACTIVE-UNIQUE",2601,()=>N(db,"INSERT partnership.ProgramLink(InitiativeId,ProgramId,RequestedByPersonId,ScopeVersion,Status) VALUES(@i,@p,@actor,N'2',N'Requested')",("@i",initiative),("@p",program),("@actor",outsider)));
        var provider=Id(db,"INSERT provider.Provider(Name,Status,CountryCode) VALUES(@n,N'Approved','JO');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag));
        N(db,"INSERT provider.ProviderMembership(ProviderId,PersonId,Role,Status) VALUES(@provider,@p,N'Owner',N'Active')",("@provider",provider),("@p",providerMember));
        var exp=Id(db,"INSERT provider.Experience(ProviderId,Kind,Title,Status,Capacity,TimeZoneId,StartAtUtc,EndAtUtc) VALUES(@provider,N'Camp',@n,N'Draft',1,N'UTC',DATEADD(day,1,SYSUTCDATETIME()),DATEADD(day,2,SYSUTCDATETIME()));SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@provider",provider),("@n",tag));
        var expLink=Id(db,"INSERT partnership.ExperienceLink(InitiativeId,ExperienceId,RequestedByPersonId,ScopeVersion,Status) VALUES(@i,@e,@actor,N'1',N'Requested');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@i",initiative),("@e",exp),("@actor",outsider));
        Expect("PART-EXPERIENCE-OWNER",65004,()=>N(db,"UPDATE partnership.ExperienceLink SET Status=N'Accepted',AcceptedByPersonId=@actor WHERE Id=@id",("@actor",outsider),("@id",expLink)));
        N(db,"UPDATE partnership.ExperienceLink SET Status=N'Accepted',AcceptedByPersonId=@actor WHERE Id=@id",("@actor",providerMember),("@id",expLink));
        Check("PART-OWNERS-RETAINED",S<long>(db,"SELECT OwnerPersonId FROM coach.CoachProgram WHERE Id=@p",("@p",program))==owner&&
            S<long>(db,"SELECT ProviderId FROM provider.Experience WHERE Id=@e",("@e",exp))==provider,
            "accepted link did not transfer Program or Experience ownership");
        var raceProgram=Id(db,"INSERT coach.CoachProgram(OwnerPersonId,Title,Status) VALUES(@p,@n,N'Draft');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",owner),("@n",tag+" race"));
        var race=await Race(initiative,raceProgram,outsider);
        Check("PART-LINK-RACE",race.Count(x=>x.error==0)==1&&race.Count(x=>x.error is 2601 or 2627)==1&&race[0].spid!=race[1].spid,
            $"SPIDs={string.Join(',',race.Select(x=>x.spid))}; errors={string.Join(',',race.Select(x=>x.error))}");
        Check("PART-PRESERVATION",S<int>(db,"SELECT COUNT(*) FROM provider.ExperienceBooking")>0&&S<int>(db,"SELECT COUNT(*) FROM institution.InitiativeMembership")>0,"Provider and M1 rows retained");
        Log("PART-SUMMARY",Failures==0?"PASS":"FAIL",$"failures={Failures}; fixtureTag={tag}");
    }
    private long Person(SqlConnection db,string suffix)=>Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" "+suffix));
    private async Task<(int spid,int error)[]> Race(long initiative,long program,long person)
    {using var gate=new Barrier(2);async Task<(int spid,int error)> Call(){using var db=Open();var spid=S<int>(db,"SELECT @@SPID");if(!gate.SignalAndWait(TimeSpan.FromSeconds(15)))throw new TimeoutException("link race timed out");
        try{N(db,"INSERT partnership.ProgramLink(InitiativeId,ProgramId,RequestedByPersonId,ScopeVersion,Status) VALUES(@i,@p,@actor,N'1',N'Requested')",("@i",initiative),("@p",program),("@actor",person));return(spid,0);}catch(SqlException e){return(spid,e.Number);}}
        return await Task.WhenAll(Task.Run(Call),Task.Run(Call));}
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

