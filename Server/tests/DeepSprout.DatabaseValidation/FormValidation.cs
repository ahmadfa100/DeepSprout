using System.Text.Json;
using Microsoft.Data.SqlClient;

internal sealed class FormValidation(string connectionString)
{
    private readonly string tag="forms-"+Guid.NewGuid().ToString("N")[..10];
    public int Failures{get;private set;}
    public async Task Execute()
    {
        using var db=Open();
        var server=S<string>(db,"SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var name=S<string>(db,"SELECT DB_NAME()");
        if(server!="DESKTOP-A4AL2KR"||name!="DeepSprout_Validation")throw new Exception($"Wrong target {server}/{name}");
        Check("FORM-ENV",true,$"{server}/{name}; SPID={S<int>(db,"SELECT @@SPID")}");
        Check("FORM-SCHEMA",S<int>(db,"SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=N'forms'")==12&&
            S<int>(db,"SELECT COUNT(*) FROM dbo.__EFMigrationsHistory")>=22&&
            S<int>(db,"SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1")==0&&
            S<int>(db,"SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1")==0,
            "12 Forms/Competition tables, 22 migrations, trusted FK/CHECK");
        var person=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" respondent"));
        var other=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@n,N'Active',1);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@n",tag+" other"));
        var initiative=S<long>(db,"SELECT TOP(1) Id FROM institution.Initiative ORDER BY Id");
        var form=Id(db,"INSERT forms.Form(InitiativeId,Purpose,Title,Status) VALUES(@i,N'Feedback',@title,N'Published');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@i",initiative),("@title",tag));
        Expect("FORM-WINDOW",547,()=>N(db,"INSERT forms.FormVersion(FormId,VersionNo,ConsentVersion,OpensAtUtc,ClosesAtUtc,PublishedAtUtc) VALUES(@f,1,N'1',DATEADD(hour,1,SYSUTCDATETIME()),SYSUTCDATETIME(),SYSUTCDATETIME())",("@f",form)),"CK_FormVersion_Window");
        var v1=Version(db,form,1);var v2=Version(db,form,2);
        Expect("FORM-VERSION-IMMUTABLE",67001,()=>N(db,"UPDATE forms.FormVersion SET ConsentVersion=N'Tamper' WHERE Id=@v",("@v",v1)));
        var q1=Question(db,v1,"text",true);var q2=Question(db,v1,"choices",false);var qOther=Question(db,v2,"other",false);
        var option1=Option(db,q2,"A",1);var optionWrong=Option(db,q1,"B",1);
        var response=Id(db,"INSERT forms.FormResponse(FormVersionId,PersonId,ResponseNo,Status) VALUES(@v,@p,1,N'Draft');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@v",v1),("@p",person));
        Expect("FORM-QUESTION-VERSION",547,()=>N(db,"INSERT forms.FormAnswer(ResponseId,QuestionId,FormVersionId,TextValue) VALUES(@r,@q,@v,N'bad')",("@r",response),("@q",qOther),("@v",v1)),"FK_FormAnswer_FormQuestion_QuestionId_FormVersionId");
        Expect("FORM-ONE-VALUE",547,()=>N(db,"INSERT forms.FormAnswer(ResponseId,QuestionId,FormVersionId,TextValue,NumberValue) VALUES(@r,@q,@v,N'bad',1)",("@r",response),("@q",q1),("@v",v1)),"CK_FormAnswer_OneValue");
        Expect("FORM-REQUIRED",67006,()=>N(db,"UPDATE forms.FormResponse SET Status=N'Submitted',SubmittedAtUtc=SYSUTCDATETIME(),ConsentAtUtc=SYSUTCDATETIME() WHERE Id=@r",("@r",response)));
        var answer1=Id(db,"INSERT forms.FormAnswer(ResponseId,QuestionId,FormVersionId,TextValue) VALUES(@r,@q,@v,N'answer');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@r",response),("@q",q1),("@v",v1));
        var answer2=Id(db,"INSERT forms.FormAnswer(ResponseId,QuestionId,FormVersionId) VALUES(@r,@q,@v);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@r",response),("@q",q2),("@v",v1));
        Expect("FORM-CHOICE-QUESTION",547,()=>N(db,"INSERT forms.FormAnswerChoice(AnswerId,OptionId,QuestionId) VALUES(@a,@o,@q)",("@a",answer2),("@o",optionWrong),("@q",q2)),"FK_FormAnswerChoice_FormQuestionOption_OptionId_QuestionId");
        N(db,"INSERT forms.FormAnswerChoice(AnswerId,OptionId,QuestionId) VALUES(@a,@o,@q)",("@a",answer2),("@o",option1),("@q",q2));
        N(db,"UPDATE forms.FormResponse SET Status=N'Submitted',SubmittedAtUtc=SYSUTCDATETIME(),ConsentAtUtc=SYSUTCDATETIME() WHERE Id=@r",("@r",response));
        Expect("FORM-ANSWER-SEALED",67007,()=>N(db,"UPDATE forms.FormAnswer SET TextValue=N'Tamper' WHERE Id=@a",("@a",answer1)));
        Expect("FORM-CHOICE-SEALED",67009,()=>N(db,"DELETE forms.FormAnswerChoice WHERE AnswerId=@a",("@a",answer2)));
        Expect("FORM-RESPONSE-TERMINAL",67004,()=>N(db,"UPDATE forms.FormResponse SET Status=N'Draft' WHERE Id=@r",("@r",response)));
        var race=await Race(v1,other);
        Check("FORM-RESPONSE-RACE",race.Count(x=>x.error==0)==1&&race.Count(x=>x.error is 2601 or 2627)==1&&race[0].spid!=race[1].spid,
            $"SPIDs={string.Join(',',race.Select(x=>x.spid))}; errors={string.Join(',',race.Select(x=>x.error))}");
        var competition=Competition(db,initiative,"A");var otherCompetition=Competition(db,initiative,"B");
        var criterion=Criterion(db,competition,"rubric-1","Quality");
        var wrongRubric=Criterion(db,competition,"rubric-2","Quality");
        var foreignCriterion=Criterion(db,otherCompetition,"rubric-1","Quality");
        var entry=Id(db,"INSERT forms.CompetitionEntry(CompetitionId,PersonId,EntryNo,Body,Status,SubmittedAtUtc) VALUES(@c,@p,1,N'entry',N'Submitted',SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@c",competition),("@p",person));
        var judgment=Id(db,"INSERT forms.CompetitionJudgment(EntryId,JudgePersonId,RubricVersion,Decision,CompetitionId,DecidedAtUtc) VALUES(@e,@p,N'rubric-1',N'Accepted',@c,SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@e",entry),("@p",other),("@c",competition));
        Expect("FORM-SCORE-COMPETITION",547,()=>N(db,"INSERT forms.CompetitionCriterionScore(JudgmentId,CriterionId,Score,CompetitionId,RubricVersion) VALUES(@j,@criterion,3,@c,N'rubric-1')",("@j",judgment),("@criterion",foreignCriterion),("@c",competition)),"FK_CompetitionCriterionScore_CompetitionCriterion_CriterionId_CompetitionId_RubricVersion");
        Expect("FORM-SCORE-RUBRIC",547,()=>N(db,"INSERT forms.CompetitionCriterionScore(JudgmentId,CriterionId,Score,CompetitionId,RubricVersion) VALUES(@j,@criterion,3,@c,N'rubric-1')",("@j",judgment),("@criterion",wrongRubric),("@c",competition)),"FK_CompetitionCriterionScore_CompetitionCriterion_CriterionId_CompetitionId_RubricVersion");
        var score=Id(db,"INSERT forms.CompetitionCriterionScore(JudgmentId,CriterionId,Score,CompetitionId,RubricVersion) VALUES(@j,@criterion,3,@c,N'rubric-1');SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@j",judgment),("@criterion",criterion),("@c",competition));
        Expect("FORM-SCORE-IMMUTABLE",67015,()=>N(db,"UPDATE forms.CompetitionCriterionScore SET Score=4 WHERE Id=@s",("@s",score)));
        Expect("FORM-JUDGMENT-IMMUTABLE",67014,()=>N(db,"UPDATE forms.CompetitionJudgment SET Decision=N'Rejected' WHERE Id=@j",("@j",judgment)));
        Check("FORM-PRESERVATION",S<int>(db,"SELECT COUNT(*) FROM institution.InitiativeMembership")>0&&S<int>(db,"SELECT COUNT(*) FROM commercial.UsageLedger")>0,"M1 and Commercial rows retained");
        Log("FORM-SUMMARY",Failures==0?"PASS":"FAIL",$"failures={Failures}; fixtureTag={tag}");
    }
    private static long Version(SqlConnection db,long form,int no)=>Id(db,"INSERT forms.FormVersion(FormId,VersionNo,ConsentVersion,OpensAtUtc,ClosesAtUtc,PublishedAtUtc) VALUES(@f,@no,N'1',DATEADD(day,-1,SYSUTCDATETIME()),DATEADD(day,1,SYSUTCDATETIME()),SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@f",form),("@no",no));
    private static long Question(SqlConnection db,long version,string key,bool required)=>Id(db,"INSERT forms.FormQuestion(FormVersionId,QuestionKey,Prompt,QuestionType,Required) VALUES(@v,@key,N'Prompt',N'Text',@req);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@v",version),("@key",key),("@req",required));
    private static long Option(SqlConnection db,long question,string code,short order)=>Id(db,"INSERT forms.FormQuestionOption(QuestionId,OptionCode,Label,SortOrder) VALUES(@q,@code,N'Option',@order);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@q",question),("@code",code),("@order",order));
    private long Competition(SqlConnection db,long initiative,string suffix)=>Id(db,"INSERT forms.Competition(InitiativeId,Title,RulesVersion,Status,OpensAtUtc,ClosesAtUtc) VALUES(@i,@title,N'1',N'Published',DATEADD(day,-1,SYSUTCDATETIME()),DATEADD(day,1,SYSUTCDATETIME()));SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@i",initiative),("@title",tag+suffix));
    private static long Criterion(SqlConnection db,long competition,string rubric,string code)=>Id(db,"INSERT forms.CompetitionCriterion(CompetitionId,CriterionCode,Label,RubricVersion) VALUES(@c,@code,N'Criterion',@rubric);SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@c",competition),("@code",code),("@rubric",rubric));
    private async Task<(int spid,int error)[]> Race(long version,long person)
    {using var gate=new Barrier(2);async Task<(int spid,int error)> Call(){using var db=Open();var spid=S<int>(db,"SELECT @@SPID");if(!gate.SignalAndWait(TimeSpan.FromSeconds(15)))throw new TimeoutException("response race timed out");
        try{N(db,"INSERT forms.FormResponse(FormVersionId,PersonId,ResponseNo,Status) VALUES(@v,@p,1,N'Draft')",("@v",version),("@p",person));return(spid,0);}catch(SqlException e){return(spid,e.Number);}}
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

