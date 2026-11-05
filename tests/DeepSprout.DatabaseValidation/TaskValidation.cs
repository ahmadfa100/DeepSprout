using System.Text.Json;
using Microsoft.Data.SqlClient;

internal sealed class TaskValidation(string connectionString)
{
    private readonly string tag="task-"+Guid.NewGuid().ToString("N")[..10];
    public int Failures{get;private set;}
    public async Task Execute()
    {
        using var db=Open();
        var server=S<string>(db,"SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var name=S<string>(db,"SELECT DB_NAME()");
        if(server!="DESKTOP-A4AL2KR"||name!="DeepSprout_Validation")throw new Exception($"Wrong target {server}/{name}");
        Check("TASK-ENV",true,$"{server}/{name}; SPID={S<int>(db,"SELECT @@SPID")}");
        Check("TASK-SCHEMA",S<int>(db,"SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=N'task'")==8&&
            S<int>(db,"SELECT COUNT(*) FROM dbo.__EFMigrationsHistory")>=13&&
            S<int>(db,"SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1")==0&&
            S<int>(db,"SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1")==0,
            "8 task tables, 13 migrations, all FK/CHECK trusted");
        var p1=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" participant"));
        var p2=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" other"));
        var program=Id(db,"INSERT coach.CoachProgram(OwnerPersonId,Title,Status) VALUES(@p,@n,N'Draft');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",p1),("@n",tag));
        var group=Id(db,"INSERT coach.OperationalGroup(ProgramId,Name,Status) VALUES(@p,@n,N'Open');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",program),("@n",tag));
        var assignment=Id(db,"INSERT task.Assignment(GroupId,AuthorPersonId,Status) VALUES(@g,@p,N'Draft');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@g",group),("@p",p1));
        var revision=Id(db,"INSERT task.AssignmentRevision(AssignmentId,RevisionNo,Instructions,ReviewMode,PublishedAtUtc) VALUES(@a,1,N'Validation',N'Manual',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@a",assignment));
        Expect("TASK-REV-IMMUTABLE",59008,()=>N(db,"UPDATE task.AssignmentRevision SET Instructions=N'Tamper' WHERE Id=@r",("@r",revision)));
        Expect("TASK-RECIPIENT-MEMBER",59002,()=>N(db,"INSERT task.AssignmentRecipient(AssignmentId,PersonId,AssignedRevisionId,Status,LastAttemptNo,AssignedAtUtc) VALUES(@a,@p,@r,N'Assigned',0,SYSUTCDATETIME())",("@a",assignment),("@p",p1),("@r",revision)));
        N(db,"INSERT coach.ProgramGroupMembership(ProgramId,GroupId,PersonId,Status) VALUES(@program,@g,@p,N'Active')",("@program",program),("@g",group),("@p",p1));
        var recipient=Id(db,"INSERT task.AssignmentRecipient(AssignmentId,PersonId,AssignedRevisionId,Status,LastAttemptNo,AssignedAtUtc) VALUES(@a,@p,@r,N'Assigned',0,SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@a",assignment),("@p",p1),("@r",revision));
        Expect("TASK-RECIPIENT-OWNER",59001,()=>N(db,"UPDATE task.AssignmentRecipient SET PersonId=@p WHERE Id=@r",("@p",p2),("@r",recipient)));
        Expect("TASK-RECIPIENT-REV-FK",547,()=>N(db,"INSERT task.AssignmentRecipient(AssignmentId,PersonId,AssignedRevisionId,Status,LastAttemptNo,AssignedAtUtc) VALUES(@a,@p,999999999,N'Assigned',0,SYSUTCDATETIME())",("@a",assignment),("@p",p2)));
        Expect("TASK-SUBMIT-DRAFT",59009,()=>S<long>(db,"DECLARE @id bigint;EXEC task.SubmitAttempt @RecipientId=@r,@PersonId=@p,@Body=N'body',@AttemptId=@id OUTPUT;SELECT @id",("@r",recipient),("@p",p1)));
        N(db,"UPDATE task.Assignment SET Status=N'Published' WHERE Id=@a",("@a",assignment));
        Expect("TASK-SUBMIT-PERSON",59009,()=>S<long>(db,"DECLARE @id bigint;EXEC task.SubmitAttempt @RecipientId=@r,@PersonId=@p,@Body=N'body',@AttemptId=@id OUTPUT;SELECT @id",("@r",recipient),("@p",p2)));
        var race=await Race(recipient,p1);
        Check("TASK-SUBMIT-RACE",race.Length==2&&race.All(x=>x.error==0)&&race[0].spid!=race[1].spid&&
            S<int>(db,"SELECT COUNT(*) FROM task.SubmissionAttempt WHERE RecipientId=@r",("@r",recipient))==2&&
            S<int>(db,"SELECT COUNT(DISTINCT AttemptNo) FROM task.SubmissionAttempt WHERE RecipientId=@r",("@r",recipient))==2&&
            S<int>(db,"SELECT LastAttemptNo FROM task.AssignmentRecipient WHERE Id=@r",("@r",recipient))==2,
            $"SPIDs={string.Join(',',race.Select(x=>x.spid))}; errors={string.Join(',',race.Select(x=>x.error))}; attempts={S<int>(db,"SELECT COUNT(*) FROM task.SubmissionAttempt WHERE RecipientId=@r",("@r",recipient))}");
        var attempt=S<long>(db,"SELECT TOP(1) Id FROM task.SubmissionAttempt WHERE RecipientId=@r ORDER BY Id",("@r",recipient));
        var otherRev=Id(db,"INSERT task.AssignmentRevision(AssignmentId,RevisionNo,Instructions,ReviewMode) VALUES(@a,2,N'Other',N'Manual');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@a",assignment));
        Expect("TASK-ATTEMPT-REV",59004,()=>N(db,"INSERT task.SubmissionAttempt(RecipientId,AttemptNo,AssignmentRevisionId,Body,AssignmentId,SubmittedAtUtc) VALUES(@r,3,@rev,N'bad',@a,SYSUTCDATETIME())",("@r",recipient),("@rev",otherRev),("@a",assignment)));
        var file=Id(db,"INSERT files.SecureFile(OwnerPersonId,Purpose,ObjectKey,MimeType,Bytes,Sha256,Status) VALUES(@p,N'Task',@key,N'text/plain',1,0x01,N'Available');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",p2),("@key",tag));
        Expect("TASK-FILE-OWNER",59004,()=>N(db,"INSERT task.SubmissionAttempt(RecipientId,AttemptNo,AssignmentRevisionId,FileId,AssignmentId,SubmittedAtUtc) VALUES(@r,3,@rev,@f,@a,SYSUTCDATETIME())",("@r",recipient),("@rev",revision),("@f",file),("@a",assignment)));
        Expect("TASK-ATTEMPT-IMMUTABLE",59003,()=>N(db,"UPDATE task.SubmissionAttempt SET Body=N'Tamper' WHERE Id=@id",("@id",attempt)));
        var ev=Id(db,"INSERT evidence.EvidenceEvent(SourceContext,SourceKey,SubjectPersonId,Kind,Provenance,SourceVersion,OccurredAtUtc,Validity) VALUES(N'task',@key,@p,N'Review',N'Validation',N'1',SYSUTCDATETIME(),N'Accepted');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@key",tag),("@p",p2));
        Expect("TASK-REVIEW-EVIDENCE-OWNER",59006,()=>N(db,"INSERT task.ReviewDecision(AttemptId,DecisionNo,ReviewerPersonId,Decision,EvidenceEventId,DecidedAtUtc) VALUES(@a,1,@p,N'Approved',@ev,SYSUTCDATETIME())",("@a",attempt),("@p",p1),("@ev",ev)));
        var decision=Id(db,"INSERT task.ReviewDecision(AttemptId,DecisionNo,ReviewerPersonId,Decision,DecidedAtUtc) VALUES(@a,1,@p,N'NeedsRevision',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@a",attempt),("@p",p1));
        Expect("TASK-REVIEW-IMMUTABLE",59005,()=>N(db,"UPDATE task.ReviewDecision SET Decision=N'Approved' WHERE Id=@d",("@d",decision)));
        var note=Id(db,"INSERT task.ReviewPrivateNote(DecisionId,AuthorPersonId,Note) VALUES(@d,@p,N'private');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@d",decision),("@p",p1));
        Expect("TASK-NOTE-IMMUTABLE",59007,()=>N(db,"UPDATE task.ReviewPrivateNote SET Note=N'Tamper' WHERE Id=@n",("@n",note)));
        Expect("TASK-REPORT-DATES",547,()=>N(db,"INSERT task.CoachReport(GroupId,AuthorPersonId,PeriodStart,PeriodEnd,Status) VALUES(@g,@p,'2026-11-02','2026-11-01',N'Draft')",("@g",group),("@p",p1)),"CK_CoachReport_Dates");
        Check("TASK-PRESERVATION",S<int>(db,"SELECT COUNT(*) FROM institution.Initiative")>0&&S<int>(db,"SELECT COUNT(*) FROM recovery.RecoveryJourney")>0,"M1 and Recovery rows retained");
        Log("TASK-SUMMARY",Failures==0?"PASS":"FAIL",$"failures={Failures}; fixtureTag={tag}");
    }
    private async Task<(int spid,int error)[]> Race(long recipient,long person)
    {
        using var gate=new Barrier(2);
        async Task<(int spid,int error)> Call()
        {
            using var db=Open();var spid=S<int>(db,"SELECT @@SPID");
            if(!gate.SignalAndWait(TimeSpan.FromSeconds(15)))throw new TimeoutException("submit race timed out");
            try{S<long>(db,"DECLARE @id bigint;EXEC task.SubmitAttempt @RecipientId=@r,@PersonId=@p,@Body=N'body',@AttemptId=@id OUTPUT;SELECT @id",("@r",recipient),("@p",person));return(spid,0);}
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

