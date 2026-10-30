# Supporting contexts ERDs

These small ERDs cover identified forms, Community, entitlements and operational delivery. They complement the core ERDs and the full keyed dictionary.

```mermaid
erDiagram
  Initiative ||--o{ Form : owns
  Form ||--o{ FormVersion : publishes
  FormVersion ||--o{ FormQuestion : contains
  FormQuestion ||--o{ FormQuestionOption : offers
  FormVersion ||--o{ FormResponse : answered
  Person ||--o{ FormResponse : identifies
  FormResponse ||--o{ FormAnswer : contains
  FormAnswer ||--o{ FormAnswerChoice : selects
  SecureFile |o--o{ FormAnswer : attaches
  Initiative ||--o{ Competition : hosts
  Competition ||--o{ CompetitionCriterion : publishes
  Competition ||--o{ CompetitionEntry : receives
  CompetitionEntry ||--o{ CompetitionJudgment : judged
  CompetitionJudgment ||--o{ CompetitionCriterionScore : scores
  FormVersion {
    bigint Id PK
    bigint FormId FK
    int VersionNo
  }
  FormResponse {
    bigint Id PK
    bigint FormVersionId FK
    bigint PersonId FK
  }
```

```mermaid
erDiagram
  Person ||--o{ Post : authors
  Post ||--o{ Comment : receives
  Post ||--o{ Reaction : receives
  Post ||--o{ Bookmark : saved_as
  Post ||--o{ ContentReport : reported
  ContentReport ||--o{ ModerationDecision : decided
  Person ||--o{ JointGoal : starts
  JointGoal ||--o{ JointGoalMember : invites
  JointGoal ||--o{ JointGoalCheckIn : records
  Post {
    bigint Id PK
    bigint AuthorPersonId FK
  }
  ModerationDecision {
    bigint Id PK
    bigint ReportId FK
  }
```

```mermaid
erDiagram
  PlanVersion ||--o{ PlanFeature : includes
  PlanVersion ||--o{ Subscription : selected_by
  Subscription ||--o{ EntitlementAllocation : allocates
  EntitlementAllocation ||--o{ UsageLedger : accounts
  EvidenceEvent ||--o{ OutboxMessage : emits
  OutboxMessage ||--o{ Notification : yields
  Notification ||--o{ DeliveryAttempt : tries
  Person ||--o{ ConsentRecord : decides
  Person ||--o{ AuditEvent : acts
  PlanVersion {
    bigint Id PK
    nvarchar PlanCode
    int VersionNo
  }
  EntitlementAllocation {
    bigint Id PK
    bigint SubscriptionId FK
  }
  Notification {
    bigint Id PK
    bigint RecipientPersonId FK
  }
```

Subscription/entitlement beneficiary is an explicit checked union of Person, Institution or Provider in the dictionary. That is a closed business set with real FKs, not an arbitrary resource ID table. Community posts/reactions are never reward sources.
