# Independent Coach, Group and shared assignment ERD

```mermaid
erDiagram
  Person ||--o{ CoachProgram : owns
  CoachProgram ||--o{ ProgramRevision : publishes
  ProgramRevision ||--o{ ProgramStage : stages
  CoachProgram ||--o{ OperationalGroup : contains
  Initiative ||--o{ OperationalGroup : contains_internally
  OperationalGroup ||--o{ GroupCoachAssignment : staffed_by
  OperationalGroup ||--o{ ProgramGroupMembership : admits_independent
  CoachProgram ||--o{ ProgramCompletion : evaluates_member
  Person ||--o{ ProgramCompletion : completes
  OperationalGroup ||--o{ InitiativeGroupPlacement : places_institutional
  OperationalGroup ||--o{ Assignment : owns
  Assignment ||--o{ AssignmentRevision : versions
  Assignment ||--o{ AssignmentRecipient : assigns
  AssignmentRecipient ||--o| Submission : work
  Submission ||--o{ SubmissionAttempt : resubmits
  SubmissionAttempt ||--o{ ReviewDecision : reviewed_or_corrected
  ReviewDecision ||--o{ ReviewPrivateNote : restricted_note
  OperationalGroup ||--o{ CoachReport : reports
  Initiative ||--o{ SupervisorReport : summarizes
  OperationalGroup {
    bigint Id PK
    bigint InitiativeId FK
    bigint ProgramId FK
  }
  Assignment {
    bigint Id PK
    bigint GroupId FK
  }
  SubmissionAttempt {
    bigint Id PK
    bigint SubmissionId FK
    int AttemptNo
  }
```

`OperationalGroup.InitiativeId XOR ProgramId` is a database check. Review correction supersedes an old decision; transfer closes a placement or Coach assignment but never rewrites authored attempts.
