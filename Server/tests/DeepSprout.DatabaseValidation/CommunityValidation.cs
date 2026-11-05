using System.Text.Json;
using Microsoft.Data.SqlClient;

internal sealed class CommunityValidation(string connectionString)
{
    private readonly string tag="community-"+Guid.NewGuid().ToString("N")[..10];
    public int Failures{get;private set;}
    public async Task Execute()
    {
        using var db=Open();
        var server=S<string>(db,"SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var name=S<string>(db,"SELECT DB_NAME()");
        if(server!="DESKTOP-A4AL2KR"||name!="DeepSprout_Validation")throw new Exception($"Wrong target {server}/{name}");
        Check("COMM-ENV",true,$"{server}/{name}; SPID={S<int>(db,"SELECT @@SPID")}");
        Check("COMM-SCHEMA",S<int>(db,"SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=N'community'")==9&&
            S<int>(db,"SELECT COUNT(*) FROM dbo.__EFMigrationsHistory")>=14&&
            S<int>(db,"SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1")==0&&
            S<int>(db,"SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1")==0,
            "9 community tables, 14 migrations, trusted FK/CHECK");
        var p1=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" owner"));
        var p2=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" other"));
        var ev=Id(db,"INSERT evidence.EvidenceEvent(SourceContext,SourceKey,SubjectPersonId,Kind,Provenance,SourceVersion,OccurredAtUtc,Validity) VALUES(N'community',@key,@p,N'Personal',N'Validation',N'1',SYSUTCDATETIME(),N'Accepted');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@key",tag),("@p",p2));
        Expect("COMM-POST-EVIDENCE-OWNER",547,()=>N(db,"INSERT community.Post(AuthorPersonId,Body,Status,SharedEvidenceEventId,PublishedAtUtc) VALUES(@p,N'body',N'Published',@ev,SYSUTCDATETIME())",("@p",p1),("@ev",ev)),"FK_Post_EvidenceEvent_SharedEvidenceEventId_AuthorPersonId");
        Expect("COMM-POST-PUBLISH-TIME",547,()=>N(db,"INSERT community.Post(AuthorPersonId,Body,Status) VALUES(@p,N'body',N'Published')",("@p",p1)),"CK_Post_Published");
        var post=Id(db,"INSERT community.Post(AuthorPersonId,Body,Status,PublishedAtUtc) VALUES(@p,N'body',N'Published',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",p1));
        Expect("COMM-POST-OWNER",60001,()=>N(db,"UPDATE community.Post SET AuthorPersonId=@p WHERE Id=@id",("@p",p2),("@id",post)));
        Expect("COMM-COMMENT-STATUS",547,()=>N(db,"INSERT community.Comment(PostId,AuthorPersonId,Body,Status) VALUES(@post,@p,N'hello',N'Draft')",("@post",post),("@p",p2)),"CK_Comment_Status");
        var comment=Id(db,"INSERT community.Comment(PostId,AuthorPersonId,Body,Status) VALUES(@post,@p,N'hello',N'Published');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@post",post),("@p",p2));
        Expect("COMM-COMMENT-OWNER",60002,()=>N(db,"UPDATE community.Comment SET AuthorPersonId=@p WHERE Id=@id",("@p",p1),("@id",comment)));
        var race=await Race(post,p1);
        Check("COMM-REACTION-RACE",race.Count(x=>x.error==0)==1&&race.Count(x=>x.error is 2601 or 2627)==1&&race[0].spid!=race[1].spid,
            $"SPIDs={string.Join(',',race.Select(x=>x.spid))}; errors={string.Join(',',race.Select(x=>x.error))}");
        N(db,"INSERT community.Bookmark(PostId,PersonId) VALUES(@post,@p)",("@post",post),("@p",p1));
        Expect("COMM-BOOKMARK-UNIQUE",2601,()=>N(db,"INSERT community.Bookmark(PostId,PersonId) VALUES(@post,@p)",("@post",post),("@p",p1)));
        Expect("COMM-REPORT-XOR",547,()=>N(db,"INSERT community.ContentReport(PostId,CommentId,ReporterPersonId,ReasonCode,Status) VALUES(@post,@comment,@p,N'Spam',N'Submitted')",("@post",post),("@comment",comment),("@p",p1)),"CK_ContentReport_Target");
        var report=Id(db,"INSERT community.ContentReport(CommentId,ReporterPersonId,ReasonCode,Status) VALUES(@comment,@p,N'Spam',N'Submitted');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@comment",comment),("@p",p1));
        Expect("COMM-REPORT-TARGET-IMMUTABLE",60003,()=>N(db,"UPDATE community.ContentReport SET PostId=@post,CommentId=NULL WHERE Id=@id",("@post",post),("@id",report)));
        var decision=Id(db,"INSERT community.ModerationDecision(ReportId,ModeratorPersonId,Decision,Reason,DecidedAtUtc) VALUES(@r,@p,N'Dismiss',N'False report',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@r",report),("@p",p2));
        Expect("COMM-MODERATION-IMMUTABLE",60004,()=>N(db,"UPDATE community.ModerationDecision SET Decision=N'Hide' WHERE Id=@id",("@id",decision)));
        var goal=Id(db,"INSERT community.JointGoal(CreatorPersonId,Title,Status) VALUES(@p,N'Validation goal',N'Active');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",p1));
        Expect("COMM-CHECKIN-MEMBER-FK",547,()=>N(db,"INSERT community.JointGoalCheckIn(GoalId,PersonId,Body,LocalDate) VALUES(@g,@p,N'hello','2026-11-01')",("@g",goal),("@p",p2)),"FK_JointGoalCheckIn_JointGoalMember_GoalId_PersonId");
        N(db,"INSERT community.JointGoalMember(GoalId,PersonId,Status) VALUES(@g,@p,N'Invited')",("@g",goal),("@p",p2));
        Expect("COMM-CHECKIN-ACTIVE",60006,()=>N(db,"INSERT community.JointGoalCheckIn(GoalId,PersonId,Body,LocalDate) VALUES(@g,@p,N'hello','2026-11-01')",("@g",goal),("@p",p2)));
        N(db,"UPDATE community.JointGoalMember SET Status=N'Active' WHERE GoalId=@g AND PersonId=@p",("@g",goal),("@p",p2));
        var checkin=Id(db,"INSERT community.JointGoalCheckIn(GoalId,PersonId,Body,LocalDate) VALUES(@g,@p,N'hello','2026-11-01');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@g",goal),("@p",p2));
        Expect("COMM-CHECKIN-IMMUTABLE",60005,()=>N(db,"UPDATE community.JointGoalCheckIn SET Body=N'Tamper' WHERE Id=@id",("@id",checkin)));
        Check("COMM-PRESERVATION",S<int>(db,"SELECT COUNT(*) FROM task.SubmissionAttempt")>0&&S<int>(db,"SELECT COUNT(*) FROM institution.Initiative")>0,"Task and M1 rows remain present");
        Log("COMM-SUMMARY",Failures==0?"PASS":"FAIL",$"failures={Failures}; fixtureTag={tag}");
    }
    private async Task<(int spid,int error)[]> Race(long post,long person)
    {
        using var gate=new Barrier(2);
        async Task<(int spid,int error)> Call()
        {
            using var db=Open();var spid=S<int>(db,"SELECT @@SPID");
            if(!gate.SignalAndWait(TimeSpan.FromSeconds(15)))throw new TimeoutException("reaction race timed out");
            try{N(db,"INSERT community.Reaction(PostId,PersonId,ReactionCode) VALUES(@post,@p,N'Like')",("@post",post),("@p",person));return(spid,0);}
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

