# Evidence, rewards, projections, reporting and audit ERD

```mermaid
erDiagram
  Person ||--o{ EvidenceEvent : subject
  EvidenceEvent ||--o{ PersonalRewardEntry : evaluates_personal
  EvidenceEvent ||--o{ GroupRewardEntry : evaluates_collective
  RewardPolicyVersion ||--o{ PersonalRewardEntry : governs
  RewardPolicyVersion ||--o{ GroupRewardEntry : governs
  Person ||--o{ PersonalRewardEntry : benefits
  Person ||--o{ PersonalGardenState : four_type_stages
  Person ||--o| PersonalGardenSummary : decorations
  Initiative |o--o| GroupGarden : collective_owner
  OperationalGroup |o--o| GroupGarden : independent_owner
  GroupGarden ||--o{ GroupRewardEntry : benefits
  GroupGarden ||--o{ GroupGardenState : projects
  EvidenceEvent ||--o{ OutboxMessage : dispatches
  OutboxMessage ||--o{ Notification : notifies
  Notification ||--o{ DeliveryAttempt : delivers
  Person ||--o{ AuditEvent : acts
  EvidenceEvent {
    bigint Id PK
    uniqueidentifier EventPublicId UK
    nvarchar SourceKey UK
    nvarchar Provenance
  }
  PersonalRewardEntry {
    bigint Id PK
    bigint EvidenceEventId FK
    bigint PersonId FK
    bigint ReversesEntryId FK
  }
  GroupGarden {
    bigint Id PK
    bigint InitiativeId FK
    bigint IndependentGroupId FK
  }
```

The source fact table retains the original operational FK; `EvidenceEvent` is a unique integration envelope. Personal and Group ledgers have separate beneficiary FKs. Projections may be rebuilt; audit/outbox are durable records.
