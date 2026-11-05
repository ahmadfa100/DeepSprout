using System.Data;
using System.Text.Json;
using Microsoft.Data.SqlClient;

internal sealed class ShieldValidation(string connectionString)
{
    private readonly string tag = "shield-" + Guid.NewGuid().ToString("N")[..10];
    public int Failures { get; private set; }

    public async Task Execute()
    {
        using var db = Open();
        var server = S<string>(db, "SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var name = S<string>(db, "SELECT DB_NAME()");
        if (server != "DESKTOP-A4AL2KR" || name != "DeepSprout_Validation") throw new Exception($"Wrong target {server}/{name}");
        Check("SHIELD-ENV", true, $"{server}/{name}; SPID={S<int>(db, "SELECT @@SPID")}");
        Check("SHIELD-SCHEMA", S<int>(db, "SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=N'shield'") == 6 &&
            S<int>(db, "SELECT COUNT(*) FROM dbo.__EFMigrationsHistory") >=6 &&
            S<int>(db, "SELECT COUNT(*) FROM sys.foreign_keys WHERE is_not_trusted=1 OR is_disabled=1") == 0 &&
            S<int>(db, "SELECT COUNT(*) FROM sys.check_constraints WHERE is_not_trusted=1 OR is_disabled=1") == 0,
            "6 Shield tables, 6 migrations, zero untrusted or disabled FK/CHECK");
        var p1 = Id(db, "INSERT iam.Person(DisplayName,Status,IndividualEnabled) OUTPUT INSERTED.Id VALUES(@name,N'Active',1)", ("@name", tag + " owner"));
        var p2 = Id(db, "INSERT iam.Person(DisplayName,Status,IndividualEnabled) OUTPUT INSERTED.Id VALUES(@name,N'Active',1)", ("@name", tag + " other"));
        var i1 = Id(db, "INSERT shield.ExtensionInstallation(PersonId,Status,PairedAtUtc) OUTPUT INSERTED.Id VALUES(@person,N'Connected',SYSUTCDATETIME())", ("@person", p1));
        var i2 = Id(db, "INSERT shield.ExtensionInstallation(PersonId,Status,PairedAtUtc) OUTPUT INSERTED.Id VALUES(@person,N'Connected',SYSUTCDATETIME())", ("@person", p2));
        var c1 = Id(db, "INSERT shield.ShieldConfiguration(PersonId,VersionNo,ConsentVersion,EffectiveAtUtc) OUTPUT INSERTED.Id VALUES(@person,1,N'consent-test',SYSUTCDATETIME())", ("@person", p1));
        var c2 = Id(db, "INSERT shield.ShieldConfiguration(PersonId,VersionNo,ConsentVersion,EffectiveAtUtc) OUTPUT INSERTED.Id VALUES(@person,1,N'consent-test',SYSUTCDATETIME())", ("@person", p2));
        N(db, "INSERT shield.ShieldSelectedDomain(ConfigurationId,DomainCode) VALUES(@config,N'video')", ("@config", c1));
        N(db, "INSERT shield.ShieldSelectedDomain(ConfigurationId,DomainCode) VALUES(@config,N'video')", ("@config", c2));
        N(db, "INSERT shield.ShieldSelectedDomain(ConfigurationId,DomainCode) VALUES(@config,N'other')", ("@config", c2));
        Expect("SHIELD-THRESHOLD", 547, () => N(db, "INSERT shield.ShieldConfiguration(PersonId,VersionNo,ThresholdMinutes,ConsentVersion,EffectiveAtUtc) VALUES(@person,2,0,N'c',SYSUTCDATETIME())", ("@person", p1)), "CK_ShieldConfiguration_Threshold");
        Expect("SHIELD-SESSION-OWNER", 547, () => N(db, "INSERT shield.ProtectionSession(PersonId,InstallationId,ConfigurationId,StartedAtUtc,EndsAtUtc,Status) VALUES(@person,@installation,@config,SYSUTCDATETIME(),DATEADD(hour,1,SYSUTCDATETIME()),N'Active')", ("@person", p1), ("@installation", i2), ("@config", c1)), "FK_ProtectionSession_ExtensionInstallation_InstallationId_PersonId");
        Expect("SHIELD-SESSION-TIME", 547, () => N(db, "INSERT shield.ProtectionSession(PersonId,InstallationId,ConfigurationId,StartedAtUtc,EndsAtUtc,Status) VALUES(@person,@installation,@config,SYSUTCDATETIME(),DATEADD(hour,-1,SYSUTCDATETIME()),N'Active')", ("@person", p1), ("@installation", i1), ("@config", c1)), "CK_ProtectionSession_Times");
        Expect("SHIELD-PERIOD-OWNER", 547, () => N(db, "INSERT shield.BrowserUsagePeriod(PersonId,InstallationId,ConfigurationId,LocalDate,TimeZoneId,ObservedSeconds,CoverageSeconds,GapCount,SequenceNo,SourceHash) VALUES(@person,@installation,@config,CONVERT(date,SYSUTCDATETIME()),N'Asia/Amman',10,20,0,1,HASHBYTES('SHA2_256',N'bad'))", ("@person", p1), ("@installation", i1), ("@config", c2)), "FK_BrowserUsagePeriod_ShieldConfiguration_ConfigurationId_PersonId");
        Expect("SHIELD-INGEST-TOTAL", 53011, () => Ingest(db, i1, c1, p1, 1, 12, "[{\"domainCode\":\"video\",\"observedSeconds\":10}]"));
        Check("SHIELD-INGEST-ROLLBACK", S<int>(db, "SELECT COUNT(*) FROM shield.BrowserUsagePeriod WHERE InstallationId=@id", ("@id", i1)) == 0,
            "invalid total inserted no period");
        Expect("SHIELD-INGEST-DOMAIN", 53014, () => Ingest(db, i1, c1, p1, 1, 10, "[{\"domainCode\":\"unselected\",\"observedSeconds\":10}]"));
        var period = Ingest(db, i1, c1, p1, 1, 10, "[{\"domainCode\":\"video\",\"observedSeconds\":10}]");
        Check("SHIELD-INGEST", S<int>(db, "SELECT COUNT(*) FROM shield.BrowserUsagePeriod p JOIN shield.BrowserUsageDomain d ON d.UsagePeriodId=p.Id AND d.ConfigurationId=p.ConfigurationId WHERE p.Id=@id AND p.ObservedSeconds=d.ObservedSeconds", ("@id", period)) == 1,
            "period and selected-domain totals committed together");
        Expect("SHIELD-DOMAIN-PAIR", 547, () => N(db, "INSERT shield.BrowserUsageDomain(UsagePeriodId,ConfigurationId,DomainCode,ObservedSeconds) VALUES(@period,@other,N'other',1)", ("@period", period), ("@other", c2)), "FK_BrowserUsageDomain_BrowserUsagePeriod_UsagePeriodId_ConfigurationId");
        Expect("SHIELD-CONFIG-IMMUTABLE", 53001, () => N(db, "UPDATE shield.ShieldConfiguration SET ConsentVersion=N'tamper' WHERE Id=@id", ("@id", c1)));
        Expect("SHIELD-DOMAINS-SEALED", 53004, () => N(db, "INSERT shield.ShieldSelectedDomain(ConfigurationId,DomainCode) VALUES(@id,N'new')", ("@id", c1)));
        Expect("SHIELD-PERIOD-IMMUTABLE", 53002, () => N(db, "UPDATE shield.BrowserUsagePeriod SET ObservedSeconds=11 WHERE Id=@id", ("@id", period)));
        var race = await Race(i1, c1, p1);
        Check("SHIELD-SEQUENCE-RACE", race.Count(x=>x.error==0)==1 && race.Count(x=>x.error is 2601 or 2627)==1 &&
            S<int>(db, "SELECT COUNT(*) FROM shield.BrowserUsagePeriod WHERE InstallationId=@id AND SequenceNo=2", ("@id", i1))==1,
            $"SPIDs={string.Join(',',race.Select(x=>x.spid))}; errors={string.Join(',',race.Select(x=>x.error))}; one sequence 2");
        Check("SHIELD-M1-LAB-PRESERVATION", S<int>(db, "SELECT COUNT(*) FROM institution.Initiative")>0 &&
            S<int>(db, "SELECT COUNT(*) FROM lab.AssessmentAttempt")>0 &&
            S<int>(db, "SELECT COUNT(*) FROM dbo.__EFMigrationsHistory WHERE MigrationId=N'20261101054044_LabAndIndividualProfile'")==1,
            "M1 and Lab rows and migration history retained");
        Log("SHIELD-SUMMARY", Failures==0?"PASS":"FAIL", $"failures={Failures}; fixtureTag={tag}");
    }

    private async Task<(int spid,int error)[]> Race(long installation,long config,long person)
    {
        using var gate = new Barrier(2);
        async Task<(int spid,int error)> Call()
        {
            using var db = Open(); var spid = S<int>(db,"SELECT @@SPID");
            if (!gate.SignalAndWait(TimeSpan.FromSeconds(15))) throw new TimeoutException("Shield race barrier timed out");
            try { Ingest(db,installation,config,person,2,10,"[{\"domainCode\":\"video\",\"observedSeconds\":10}]"); return (spid,0); }
            catch (SqlException e) { return (spid,e.Number); }
        }
        return await Task.WhenAll(Task.Run(Call),Task.Run(Call));
    }
    private static long Ingest(SqlConnection db,long installation,long config,long person,long sequence,int observed,string domains)
    {
        using var command = Command(db,"shield.IngestUsagePeriod",true,("@InstallationId",installation),("@ConfigurationId",config),
            ("@PersonId",person),("@LocalDate",DateTime.UtcNow.Date),("@TimeZoneId","Asia/Amman"),("@ObservedSeconds",observed),
            ("@CoverageSeconds",20),("@GapCount",0),("@SequenceNo",sequence),("@SourceHash",new byte[32]),("@DomainsJson",domains));
        var output = command.Parameters.Add("@PeriodId",SqlDbType.BigInt); output.Direction=ParameterDirection.Output;
        command.ExecuteNonQuery(); return (long)output.Value;
    }
    private SqlConnection Open() { var db=new SqlConnection(connectionString); db.Open(); return db; }
    private static SqlCommand Command(SqlConnection db,string sql,bool proc,params (string name,object? value)[] args)
    { var c=db.CreateCommand(); c.CommandText=sql; c.CommandType=proc?CommandType.StoredProcedure:CommandType.Text; c.CommandTimeout=30;
      foreach(var (name,value) in args)c.Parameters.AddWithValue(name,value??DBNull.Value); return c; }
    private static T S<T>(SqlConnection db,string sql,params (string name,object? value)[] args)
    { using var c=Command(db,sql,false,args); var v=c.ExecuteScalar()!; return v is T t?t:(T)Convert.ChangeType(v,typeof(T)); }
    private static long Id(SqlConnection db,string sql,params (string name,object? value)[] args)=>S<long>(db,sql,args);
    private static void N(SqlConnection db,string sql,params (string name,object? value)[] args)
    {using var c=Command(db,sql,false,args);c.ExecuteNonQuery();}
    private void Check(string id,bool pass,string detail){if(!pass)Failures++;Log(id,pass?"PASS":"FAIL",detail);}
    private void Expect(string id,int number,Action action,string? constraint=null)
    {try{action();Check(id,false,$"expected SQL {number}, succeeded");}catch(SqlException e){Check(id,e.Number==number&&(constraint==null||e.Message.Contains(constraint,StringComparison.Ordinal)),$"SQL {e.Number}; {e.Message.Split('\n')[0].Trim()}");}}
    private static void Log(string id,string status,string detail)=>Console.WriteLine(JsonSerializer.Serialize(new{timestampUtc=DateTime.UtcNow,id,status,detail}));
}

