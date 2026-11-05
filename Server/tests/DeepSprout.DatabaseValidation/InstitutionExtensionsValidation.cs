using System.Text.Json;
using Microsoft.Data.SqlClient;

internal sealed class InstitutionExtensionsValidation(string connectionString)
{
    private readonly string tag="inst-ext-"+Guid.NewGuid().ToString("N")[..10];
    public int Failures{get;private set;}
    public async Task Execute()
    {
        using var db=Open();
        var server=S<string>(db,"SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var name=S<string>(db,"SELECT DB_NAME()");
        if(server!="DESKTOP-A4AL2KR"||name!="DeepSprout_Validation")throw new Exception($"Wrong target {server}/{name}");
        Check("IE-ENV",true,$"{server}/{name}; SPID={S<int>(db,"SELECT @@SPID")}");
        Check("IE-SCHEMA",S<int>(db,"SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=N'institution'")==13&&
            S<int>(db,"SELECT COUNT(*) FROM dbo.__EFMigrationsHistory")>=19&&
            S<int>(db,"SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1")==0&&
            S<int>(db,"SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1")==0,
            "13 Institution tables, 19 migrations, trusted FK/CHECK");
        var rep=Person(db,"representative");var outsider=Person(db,"outsider");var a=Person(db,"applicant A");var b=Person(db,"applicant B");
        var inst=Id(db,"INSERT institution.Institution(Name,Status,CountryCode) VALUES(@n,N'Verified','JO');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag));
        N(db,"INSERT institution.RepresentativeMembership(InstitutionId,PersonId,Status,GrantedByPersonId) VALUES(@inst,@rep,N'Active',@rep)",("@inst",inst),("@rep",rep));
        var (initiative,rev)=Published(db,inst,1);
        var appA=Application(db,initiative,rev,a);
        var appB=Application(db,initiative,rev,b);
        var offer=Offer(db,initiative,appA);
        Expect("IE-OFFER-CAPACITY",64003,()=>Offer(db,initiative,appB));
        Expect("IE-APPROVE-HELD",51212,()=>Approve(db,appB,rep));
        var membership=Approve(db,appA,rep);
        Check("IE-APPROVE-TRANSFER",membership>0&&S<string>(db,"SELECT Status FROM institution.InitiativeSeatOffer WHERE Id=@id",("@id",offer))=="Accepted"&&
            S<int>(db,"SELECT COUNT(*) FROM institution.InitiativeMembership WHERE InitiativeId=@i AND CapacityReleasedAtUtc IS NULL",("@i",initiative))==1,
            "own held offer became one membership within approval transaction");
        Expect("IE-APPROVE-FULL",51212,()=>Approve(db,appB,rep));
        var release=Id(db,"INSERT governance.ContentRelease(TargetCode,VersionNo,PayloadRef,PublishedByPersonId,PublishedAtUtc) VALUES(@code,1,N'validation',@rep,SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@code",tag),("@rep",rep));
        N(db,"INSERT institution.InitiativeContent(InitiativeId,ContentReleaseId,SortOrder,Status) VALUES(@i,@r,1,N'Published')",("@i",initiative),("@r",release));
        Expect("IE-CONTENT-ORDER",547,()=>N(db,"INSERT institution.InitiativeContent(InitiativeId,ContentReleaseId,SortOrder,Status) VALUES(@i,@r,0,N'Draft')",("@i",initiative),("@r",release)),"CK_InitiativeContent_Order");
        var (toCancel,rev2)=Published(db,inst,1);
        var cancelApp=Application(db,toCancel,rev2,Person(db,"cancel applicant"));
        var cancelOffer=Offer(db,toCancel,cancelApp);
        Expect("IE-CANCEL-AUTH",51705,()=>Cancel(db,toCancel,outsider,"Unauthorized"));
        Check("IE-CANCEL-AUTH-STATE",S<string>(db,"SELECT Status FROM institution.InitiativeSeatOffer WHERE Id=@o",("@o",cancelOffer))=="Offered", "unauthorized request preserved offer");
        N(db,"BEGIN TRY BEGIN TRAN; EXEC institution.CancelInitiative @InitiativeId=@i,@ActorPersonId=@rep,@Reason=N'Rollback proof'; THROW 51799,'Injected failure',1; END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; IF ERROR_NUMBER()<>51799 THROW; END CATCH",("@i",toCancel),("@rep",rep));
        Check("IE-CANCEL-ROLLBACK",S<string>(db,"SELECT Status FROM institution.Initiative WHERE Id=@i",("@i",toCancel))=="Published"&&
            S<string>(db,"SELECT Status FROM institution.InitiativeSeatOffer WHERE Id=@o",("@o",cancelOffer))=="Offered"&&
            S<string>(db,"SELECT Status FROM institution.InitiativeApplication WHERE Id=@a",("@a",cancelApp))=="Offered", "injected outer failure rolled back Initiative, offer, and application");
        Cancel(db,toCancel,rep,"Owner approved cancellation");
        Check("IE-CANCEL-OFFER",S<string>(db,"SELECT Status FROM institution.InitiativeSeatOffer WHERE Id=@o",("@o",cancelOffer))=="Cancelled"&&
            S<string>(db,"SELECT Status FROM institution.InitiativeApplication WHERE Id=@a",("@a",cancelApp))=="Cancelled"&&
            S<int>(db,"SELECT COUNT(*) FROM ops.AuditEvent WHERE ResourceKind=N'InitiativeSeatOffer' AND ResourcePublicId=(SELECT PublicId FROM institution.InitiativeSeatOffer WHERE Id=@o) AND Action=N'InitiativeCancelled'",("@o",cancelOffer))==1,
            "permanent cancellation closed offer and application, one offer audit");
        Expect("IE-CANCEL-DUPLICATE",51703,()=>Cancel(db,toCancel,rep,"Again"));
        var (raceInit,raceRev)=Published(db,inst,1);
        var raceA=Application(db,raceInit,raceRev,Person(db,"race A"));
        var raceB=Application(db,raceInit,raceRev,Person(db,"race B"));
        N(db,"UPDATE institution.InitiativeApplication SET Status=N'Pending' WHERE Id IN (@a,@b)",("@a",raceA),("@b",raceB));
        Expect("IE-OFFER-COMMAND-AUTH",64007,()=>OfferCommand(db,raceA,outsider));
        var race=await Race(raceA,raceB,rep);
        Check("IE-OFFER-RACE",race.Count(x=>x.error==0)==1&&race.Count(x=>x.error==64003)==1&&race[0].spid!=race[1].spid&&
            S<int>(db,"SELECT COUNT(*) FROM institution.InitiativeSeatOffer WHERE InitiativeId=@i AND Status=N'Offered'",("@i",raceInit))==1,
            $"SPIDs={string.Join(',',race.Select(x=>x.spid))}; errors={string.Join(',',race.Select(x=>x.error))}");
        Check("IE-PRESERVATION",S<int>(db,"SELECT COUNT(*) FROM institution.InitiativeMembership")>0&&S<int>(db,"SELECT COUNT(*) FROM provider.ExperienceBooking")>0,"M1 and Provider rows remain present");
        Log("IE-SUMMARY",Failures==0?"PASS":"FAIL",$"failures={Failures}; fixtureTag={tag}");
    }
    private long Person(SqlConnection db,string suffix)=>Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" "+suffix));
    private static (long id,long revision) Published(SqlConnection db,long inst,short capacity)
    {
        var id=Id(db,"INSERT institution.Initiative(InstitutionId,Status) VALUES(@inst,N'Draft');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@inst",inst));
        var rev=Id(db,"INSERT institution.InitiativeRevision(InitiativeId,RevisionNo,Summary,AudienceCode,CostKind,CompletionPolicyRef,Title,Mode,Capacity,TimeZoneId,StartsAtUtc,EndsAtUtc,WithdrawalCutoffAtUtc,PublishedSnapshotJson) VALUES(@i,1,N'Validation',N'Adult',N'Free',N'validation',N'Offer validation',N'Online',@capacity,N'UTC',DATEADD(hour,200,SYSUTCDATETIME()),DATEADD(hour,203,SYSUTCDATETIME()),DATEADD(hour,100,SYSUTCDATETIME()),N'{}');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@i",id),("@capacity",capacity));
        N(db,"UPDATE institution.Initiative SET Title=N'Offer validation',Mode=N'Online',Status=N'Published',Capacity=@capacity,TimeZoneId=N'UTC',StartsAtUtc=DATEADD(hour,200,SYSUTCDATETIME()),EndsAtUtc=DATEADD(hour,203,SYSUTCDATETIME()),WithdrawalCutoffAtUtc=DATEADD(hour,100,SYSUTCDATETIME()) WHERE Id=@i",("@i",id),("@capacity",capacity));
        return(id,rev);
    }
    private static long Application(SqlConnection db,long initiative,long revision,long person)=>Id(db,"INSERT institution.InitiativeApplication(InitiativeId,PersonId,TermsRevisionId,Status,AttemptNo,SubmittedAtUtc) VALUES(@i,@p,@r,N'Offered',1,SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@i",initiative),("@p",person),("@r",revision));
    private static long Offer(SqlConnection db,long initiative,long application)=>Id(db,"INSERT institution.InitiativeSeatOffer(InitiativeId,ApplicationId,Status,OfferedAtUtc,ExpiresAtUtc) VALUES(@i,@a,N'Offered',SYSUTCDATETIME(),DATEADD(day,1,SYSUTCDATETIME()));SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@i",initiative),("@a",application));
    private static long Approve(SqlConnection db,long app,long actor)=>S<long>(db,"DECLARE @id bigint;EXEC institution.ApproveApplication @ApplicationId=@a,@ActorPersonId=@actor,@MembershipId=@id OUTPUT;SELECT @id",("@a",app),("@actor",actor));
    private static void Cancel(SqlConnection db,long initiative,long actor,string reason)=>N(db,"EXEC institution.CancelInitiative @InitiativeId=@i,@ActorPersonId=@actor,@Reason=@reason",("@i",initiative),("@actor",actor),("@reason",reason));
    private static long OfferCommand(SqlConnection db,long app,long actor)=>S<long>(db,"DECLARE @id bigint; EXEC institution.CreateSeatOffer @ApplicationId=@a,@ActorPersonId=@actor,@ExpiresAtUtc=@expiry,@OfferId=@id OUTPUT;SELECT @id",("@a",app),("@actor",actor),("@expiry",DateTime.UtcNow.AddDays(1)));
    private async Task<(int spid,int error)[]> Race(long a,long b,long actor)
    {
        using var gate=new Barrier(2);
        async Task<(int spid,int error)> Call(long app)
        {using var db=Open();var spid=S<int>(db,"SELECT @@SPID");if(!gate.SignalAndWait(TimeSpan.FromSeconds(15)))throw new TimeoutException("offer race timed out");
            try{OfferCommand(db,app,actor);return(spid,0);}catch(SqlException e){return(spid,e.Number);}}
        return await Task.WhenAll(Task.Run(()=>Call(a)),Task.Run(()=>Call(b)));
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

