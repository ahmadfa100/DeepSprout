# Identity and permission ERD

```mermaid
erDiagram
  Person ||--o{ PersonEmail : verifies
  Person ||--o| PasswordCredential : has
  Person ||--o{ OtpChallenge : receives
  Person ||--o{ GlobalGrant : may_hold
  Person ||--o| IndividualProfile : upgrades_to
  Person ||--o{ RepresentativeMembership : represents
  Institution ||--o{ RepresentativeMembership : authorizes
  Person ||--o{ InitiativeStaffAppointment : appointed
  Initiative ||--o{ InitiativeStaffInvitation : invites
  InitiativeStaffInvitation ||--o| InitiativeStaffAppointment : accepted_as
  Initiative ||--o{ InitiativeStaffAppointment : scopes
  Person ||--o{ ProviderMembership : staffs
  Provider ||--o{ ProviderMembership : authorizes
  Experience ||--o{ ProviderStaffAppointment : scopes
  Person ||--o{ ProviderStaffAppointment : appointed
  Person ||--o{ ProgramGroupMembership : participates
  OperationalGroup ||--o{ ProgramGroupMembership : contains
  Person ||--o{ InitiativeMembership : participates
  Initiative ||--o{ InitiativeMembership : contains
  Person {
    bigint Id PK
    uniqueidentifier PublicId UK
  }
  PersonEmail {
    bigint Id PK
    bigint PersonId FK
    nvarchar NormalizedEmail UK
  }
  InitiativeStaffAppointment {
    bigint Id PK
    bigint InitiativeId FK
    bigint PersonId FK
    nvarchar Role
  }
  InitiativeMembership {
    bigint Id PK
    bigint InitiativeId FK
    bigint PersonId FK
  }
```

`GlobalGrant` is not a replacement for resource appointment. Invitation tokens and OTP are hashes. The appointed Person ID remains the same through Student→Individual upgrade.
