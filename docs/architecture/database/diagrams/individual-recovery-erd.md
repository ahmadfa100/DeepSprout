# Individual, Lab, Recovery, Activity and Shield ERD

```mermaid
erDiagram
  Person ||--o| IndividualProfile : owns
  Person ||--o| OnboardingProgress : resumes
  AssessmentInstrument ||--o{ InstrumentVersion : publishes
  InstrumentVersion ||--o{ AssessmentAttempt : used_by
  Person ||--o{ AssessmentAttempt : takes
  AssessmentWindow |o--o{ AssessmentAttempt : permits
  AssessmentAttempt ||--o{ AssessmentResponse : records
  AssessmentAttempt ||--o{ AssessmentScore : scores
  Person ||--o| RecoveryJourney : owns
  RecoveryJourney ||--o{ RecoveryCycle : contains
  RecoveryCycle ||--o{ PlanRevision : versions
  PlanRevision ||--o{ ScheduledAction : schedules
  RecoveryCycle ||--o{ WeeklyReview : reviews
  PracticeDefinition ||--o{ PracticeVersion : publishes
  PracticeVersion ||--o{ PracticeAttempt : executed_as
  Person ||--o{ PracticeAttempt : performs
  Person ||--o{ OfflineRoutine : defines
  OfflineRoutine ||--o{ RoutineCheckIn : logs
  Person ||--o{ ExtensionInstallation : pairs
  ExtensionInstallation ||--o{ BrowserUsagePeriod : observes
  ShieldConfiguration ||--o{ ProtectionSession : configures
  Person ||--o{ ShieldConfiguration : chooses
  AssessmentAttempt {
    bigint Id PK
    bigint InstrumentVersionId FK
    bigint PersonId FK
  }
  PlanRevision {
    bigint Id PK
    bigint CycleId FK
    int RevisionNo
  }
  PracticeAttempt {
    bigint Id PK
    bigint PracticeVersionId FK
    bigint PersonId FK
  }
  BrowserUsagePeriod {
    bigint Id PK
    bigint InstallationId FK
    bigint SequenceNo
  }
```

These sources remain distinct. A Lab score, self-report, supported-browser observation and scheduled practice completion are not interchangeable measurements.
