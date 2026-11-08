using System.Text.Json;
using Microsoft.Data.SqlClient;

internal sealed class RecoveryActivityValidation(string connectionString)
{
    private readonly string tag="recovery-"+Guid.NewGuid().ToString("N")[..10];
    public int Failures{get;private set;}
    public async Task Execute()
    {
        using var db=Open();
        var server=S<string>(db,"SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName'))");
        var name=S<string>(db,"SELECT DB_NAME()");
        if(server!="DESKTOP-A4AL2KR"||name!="DeepSprout_Validation")throw new Exception($"Wrong target {server}/{name}");
        Check("REC-ENV",true,$"{server}/{name}; SPID={S<int>(db,"SELECT @@SPID")}");
        Check("REC-SCHEMA",S<int>(db,"SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name IN (N'recovery',N'activity')")==11&&
            S<int>(db,"SELECT COUNT(*) FROM dbo.__EFMigrationsHistory")>=11&&
            S<int>(db,"SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1")==0&&
            S<int>(db,"SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1")==0,
            "11 Recovery/Activity tables, 11 migrations, trusted FK/CHECK");
        var p1=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@name,N'Active',1); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@name",tag+" owner"));
        var p2=Id(db,"INSERT iam.Person(DisplayName,Status,IndividualEnabled) VALUES(@name,N'Active',1); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@name",tag+" other"));
        var journey=Id(db,"INSERT recovery.RecoveryJourney(PersonId,StartedAtUtc,Status) VALUES(@p,SYSUTCDATETIME(),N'Active'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",p1));
        Check("REC-LEVEL-ONE-DEFAULT",S<int>(db,"SELECT JourneyLevel FROM recovery.RecoveryJourney WHERE Id=@j",("@j",journey))==1,"new journeys start at Level 1");
        Expect("REC-LEVEL-ZERO-REJECTED",547,()=>N(db,"UPDATE recovery.RecoveryJourney SET JourneyLevel=0 WHERE Id=@j",("@j",journey)),"CK_RecoveryJourney_Level");
        Expect("REC-JOURNEY-ACTIVE",2601,()=>N(db,"INSERT recovery.RecoveryJourney(PersonId,StartedAtUtc,Status) VALUES(@p,SYSUTCDATETIME(),N'Active')",("@p",p1)));
        var cycle=Id(db,"INSERT recovery.RecoveryCycle(JourneyId,PersonId,CycleNo,Status,TimeZoneId) VALUES(@j,@p,1,N'Draft',N'Asia/Amman'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@j",journey),("@p",p1));
        Expect("REC-CYCLE-OWNER",547,()=>N(db,"INSERT recovery.RecoveryCycle(JourneyId,PersonId,CycleNo,Status,TimeZoneId) VALUES(@j,@p,2,N'Draft',N'Asia/Amman')",("@j",journey),("@p",p2)),"FK_RecoveryCycle_RecoveryJourney_JourneyId_PersonId");
        var race=await ActiveCycleRace(journey,p1);
        Check("REC-ACTIVE-CYCLE-RACE",race.Count(x=>x.error==0)==1&&race.Count(x=>x.error is 2601 or 2627)==1&&
            S<int>(db,"SELECT COUNT(*) FROM recovery.RecoveryCycle WHERE JourneyId=@j AND Status=N'Active'",("@j",journey))==1,
            $"SPIDs={string.Join(',',race.Select(x=>x.spid))}; errors={string.Join(',',race.Select(x=>x.error))}");
        var plan=Id(db,"INSERT recovery.PlanRevision(CycleId,RevisionNo,GoalCode,PolicyVersion,EffectiveFromLocalDate,Reason,Status,AcceptedAtUtc) VALUES(@c,1,N'focus',N'policy-1',CONVERT(date,SYSUTCDATETIME()),N'Initial',N'Accepted',SYSUTCDATETIME()); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@c",cycle));
        Expect("REC-PLAN-IMMUTABLE",57003,()=>N(db,"UPDATE recovery.PlanRevision SET GoalCode=N'tamper' WHERE Id=@id",("@id",plan)));
        Expect("REC-PLAN-NO",547,()=>N(db,"INSERT recovery.PlanRevision(CycleId,RevisionNo,GoalCode,PolicyVersion,EffectiveFromLocalDate,Reason,Status) VALUES(@c,0,N'focus',N'p',CONVERT(date,SYSUTCDATETIME()),N'Bad',N'Draft')",("@c",cycle)),"CK_PlanRevision_No");
        Expect("ACT-TYPE",547,()=>N(db,"INSERT activity.PracticeDefinition(Code,PracticeType,Status) VALUES(@code,N'Generic Timer',N'Draft')",("@code",tag+"-bad")),"CK_PracticeDefinition_Type");
        var definition=Id(db,"INSERT activity.PracticeDefinition(Code,PracticeType,Status) VALUES(@code,N'Depth Practice',N'Published'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@code",tag));
        Expect("ACT-VERSION-TIER",547,()=>N(db,"INSERT activity.PracticeVersion(DefinitionId,VersionNo,ContentRef,DifficultyTier,EvidenceTier,ValidationVersion,PublishedAtUtc) VALUES(@id,1,N'content',0,N'Checked',N'v1',SYSUTCDATETIME())",("@id",definition)),"CK_PracticeVersion_Tier");
        var version=Id(db,"INSERT activity.PracticeVersion(DefinitionId,VersionNo,ContentRef,DifficultyTier,EvidenceTier,ValidationVersion,PublishedAtUtc) VALUES(@id,1,N'content',1,N'Checked',N'v1',SYSUTCDATETIME()); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@id",definition));
        var version2=Id(db,"INSERT activity.PracticeVersion(DefinitionId,VersionNo,ContentRef,DifficultyTier,EvidenceTier,ValidationVersion,PublishedAtUtc) VALUES(@id,2,N'content-2',2,N'Checked',N'v1',SYSUTCDATETIME()); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@id",definition));
        Expect("ACT-VERSION-IMMUTABLE",57004,()=>N(db,"UPDATE activity.PracticeVersion SET ContentRef=N'tamper' WHERE Id=@id",("@id",version)));
        Expect("REC-ACTION-PRACTICE",547,()=>N(db,"INSERT recovery.ScheduledAction(CycleId,PersonId,PlanRevisionId,LocalDate,ActionKind,Status) VALUES(@c,@p,@plan,CONVERT(date,SYSUTCDATETIME()),N'Practice',N'Due')",("@c",cycle),("@p",p1),("@plan",plan)),"CK_ScheduledAction_Practice");
        Expect("REC-ACTION-OWNER",547,()=>N(db,"INSERT recovery.ScheduledAction(CycleId,PersonId,PlanRevisionId,PracticeVersionId,LocalDate,ActionKind,Status) VALUES(@c,@p,@plan,@version,CONVERT(date,SYSUTCDATETIME()),N'Practice',N'Due')",("@c",cycle),("@p",p2),("@plan",plan),("@version",version)),"FK_ScheduledAction_RecoveryCycle_CycleId_PersonId");
        var action=Id(db,"INSERT recovery.ScheduledAction(CycleId,PersonId,PlanRevisionId,PracticeVersionId,LocalDate,ActionKind,Status) VALUES(@c,@p,@plan,@version,CONVERT(date,SYSUTCDATETIME()),N'Practice',N'Due'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@c",cycle),("@p",p1),("@plan",plan),("@version",version));
        Expect("ACT-ATTEMPT-OWNER",547,()=>N(db,"INSERT activity.PracticeAttempt(PersonId,PracticeVersionId,ScheduledActionId,Status,StartedAtUtc) VALUES(@p,@version,@action,N'Started',SYSUTCDATETIME())",("@p",p2),("@version",version),("@action",action)),"FK_PracticeAttempt_ScheduledAction_ScheduledActionId_PersonId");
        Expect("ACT-ATTEMPT-VERSION",57006,()=>N(db,"INSERT activity.PracticeAttempt(PersonId,PracticeVersionId,ScheduledActionId,Status,StartedAtUtc) VALUES(@p,@version,@action,N'Started',SYSUTCDATETIME())",("@p",p1),("@version",version2),("@action",action)));
        var attempt=Id(db,"INSERT activity.PracticeAttempt(PersonId,PracticeVersionId,ScheduledActionId,Status,StartedAtUtc) VALUES(@p,@version,@action,N'Started',SYSUTCDATETIME()); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",p1),("@version",version),("@action",action));
        var otherEvent=NewEvent(db,p2,"other");
        Expect("ACT-EVIDENCE-OWNER",547,()=>N(db,"UPDATE activity.PracticeAttempt SET Status=N'Completed',Valid=1,EndedAtUtc=SYSUTCDATETIME(),EvidenceEventId=@event WHERE Id=@id",("@event",otherEvent),("@id",attempt)),"FK_PracticeAttempt_EvidenceEvent_EvidenceEventId_PersonId");
        var eventId=NewEvent(db,p1,"source");
        N(db,"UPDATE activity.PracticeAttempt SET Status=N'Completed',Valid=1,EndedAtUtc=SYSUTCDATETIME(),EvidenceEventId=@event WHERE Id=@id",("@event",eventId),("@id",attempt));
        N(db,"UPDATE recovery.ScheduledAction SET Status=N'Completed',CompletedAttemptId=@attempt WHERE Id=@action",("@attempt",attempt),("@action",action));
        Check("REC-COMPLETION-LINK",S<int>(db,"SELECT COUNT(*) FROM recovery.ScheduledAction WHERE Id=@action AND CompletedAttemptId=@attempt AND Status=N'Completed'",("@action",action),("@attempt",attempt))==1,
            "same-person completed attempt linked to its scheduled action");
        var secondAction=Id(db,"INSERT recovery.ScheduledAction(CycleId,PersonId,PlanRevisionId,PracticeVersionId,LocalDate,ActionKind,Status) VALUES(@c,@p,@plan,@version,DATEADD(day,1,CONVERT(date,SYSUTCDATETIME())),N'Practice',N'Due'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@c",cycle),("@p",p1),("@plan",plan),("@version",version));
        Expect("REC-COMPLETION-MISMATCH",57005,()=>N(db,"UPDATE recovery.ScheduledAction SET CompletedAttemptId=@attempt,Status=N'Completed' WHERE Id=@action",("@attempt",attempt),("@action",secondAction)));
        var routine=Id(db,"INSERT activity.OfflineRoutine(PersonId,Title,Status) VALUES(@p,N'Offline walk',N'Active'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@p",p1));
        Expect("ACT-ROUTINE-OWNER",547,()=>N(db,"INSERT activity.RoutineCheckIn(RoutineId,PersonId,LocalDate,State) VALUES(@r,@p,CONVERT(date,SYSUTCDATETIME()),N'Done')",("@r",routine),("@p",p2)),"FK_RoutineCheckIn_OfflineRoutine_RoutineId_PersonId");
        Expect("ACT-ROUTINE-EVIDENCE-OWNER",547,()=>N(db,"INSERT activity.RoutineCheckIn(RoutineId,PersonId,LocalDate,State,EvidenceEventId) VALUES(@r,@p,CONVERT(date,SYSUTCDATETIME()),N'Done',@event)",("@r",routine),("@p",p1),("@event",otherEvent)),"FK_RoutineCheckIn_EvidenceEvent_EvidenceEventId_PersonId");
        var checkRace=await CheckInRace(routine,p1);
        Check("ACT-CHECKIN-RACE",checkRace.Count(x=>x.error==0)==1&&checkRace.Count(x=>x.error is 2601 or 2627)==1&&
            S<int>(db,"SELECT COUNT(*) FROM activity.RoutineCheckIn WHERE RoutineId=@r AND LocalDate=CONVERT(date,SYSUTCDATETIME())",("@r",routine))==1,
            $"SPIDs={string.Join(',',checkRace.Select(x=>x.spid))}; errors={string.Join(',',checkRace.Select(x=>x.error))}");
        var review=Id(db,"INSERT recovery.WeeklyReview(CycleId,WeekNo,PlanRevisionId,DecisionCode,ReviewedAtUtc) VALUES(@c,1,@plan,N'Stay',SYSUTCDATETIME()); SELECT CAST(SCOPE_IDENTITY() AS bigint)",("@c",cycle),("@plan",plan));
        Expect("REC-REVIEW-IMMUTABLE",57007,()=>N(db,"UPDATE recovery.WeeklyReview SET DecisionCode=N'Tamper' WHERE Id=@id",("@id",review)));
        Expect("ACT-PROGRESSION-TIER",547,()=>N(db,"INSERT activity.PracticeProgressionDecision(PersonId,PracticeType,FromTier,ToTier,PolicyVersion,DecisionCode,DecidedAtUtc) VALUES(@p,N'Depth Practice',0,1,N'p',N'Accepted',SYSUTCDATETIME())",("@p",p1)),"CK_PracticeProgressionDecision_Tiers");
        Check("REC-DATA-PRESERVATION",S<int>(db,"SELECT COUNT(*) FROM institution.Initiative")>0&&S<int>(db,"SELECT COUNT(*) FROM evidence.EvidenceEvent")>0,
            "M1 and Evidence rows remain present");
        Log("REC-SUMMARY",Failures==0?"PASS":"FAIL",$"failures={Failures}; fixtureTag={tag}");
    }
    private long NewEvent(SqlConnection db,long person,string key)=>Id(db,
        "INSERT evidence.EvidenceEvent(SourceContext,SourceKey,SubjectPersonId,Kind,Provenance,SourceVersion,OccurredAtUtc,Validity) VALUES(N'Validation',@key,@p,N'Practice',N'Fixture',N'v1',SYSUTCDATETIME(),N'Accepted'); SELECT CAST(SCOPE_IDENTITY() AS bigint)",
        ("@key",tag+"-"+key),("@p",person));
    private async Task<(int spid,int error)[]> ActiveCycleRace(long journey,long person)
    {
        using var gate=new Barrier(2);
        async Task<(int spid,int error)> Call(int no)
        {using var db=Open();var spid=S<int>(db,"SELECT @@SPID");if(!gate.SignalAndWait(TimeSpan.FromSeconds(15)))throw new TimeoutException("Cycle race barrier timed out");
         try{N(db,"INSERT recovery.RecoveryCycle(JourneyId,PersonId,CycleNo,Status,TimeZoneId) VALUES(@j,@p,@no,N'Active',N'Asia/Amman')",("@j",journey),("@p",person),("@no",no));return(spid,0);}
         catch(SqlException e){return(spid,e.Number);}}
        return await Task.WhenAll(Task.Run(()=>Call(2)),Task.Run(()=>Call(3)));
    }
    private async Task<(int spid,int error)[]> CheckInRace(long routine,long person)
    {
        using var gate=new Barrier(2);
        async Task<(int spid,int error)> Call()
        {using var db=Open();var spid=S<int>(db,"SELECT @@SPID");if(!gate.SignalAndWait(TimeSpan.FromSeconds(15)))throw new TimeoutException("Check-in race barrier timed out");
         try{N(db,"INSERT activity.RoutineCheckIn(RoutineId,PersonId,LocalDate,State) VALUES(@r,@p,CONVERT(date,SYSUTCDATETIME()),N'Done')",("@r",routine),("@p",person));return(spid,0);}
         catch(SqlException e){return(spid,e.Number);}}
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

