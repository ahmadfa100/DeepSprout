# Institution, Initiative, admission, session and forms ERD

```mermaid
erDiagram
  Institution ||--o{ Initiative : owns
  Institution ||--o{ Session : hosts
  Institution ||--o{ RepresentativeMembership : grants
  Initiative ||--o{ InitiativeRevision : publishes
  Initiative ||--o{ InitiativeApplication : receives
  InitiativeApplication ||--o| InitiativeMembership : accepted_as
  InitiativeApplication ||--o{ InitiativeSeatOffer : queued_offer
  Initiative ||--o{ InitiativeSeat : has_slots
  InitiativeSeatOffer |o--o| InitiativeSeat : holds
  InitiativeMembership |o--o| InitiativeSeat : occupies
  Initiative ||--o{ OperationalGroup : internal_group
  InitiativeMembership ||--o{ InitiativeGroupPlacement : placed
  OperationalGroup ||--o{ InitiativeGroupPlacement : receives
  Initiative ||--o{ InitiativeStaffAppointment : scopes
  Initiative |o--o{ Session : optionally_schedules
  Session ||--o{ InitiativeSessionDuty : assigned_in_initiative
  Session ||--o{ StandaloneSessionSupervisorAppointment : appointed_when_standalone
  Session ||--o{ SessionCapacityPool : has_modes
  SessionCapacityPool ||--o{ SessionSeat : has_slots
  Session ||--o{ SessionRegistration : receives
  SessionRegistration ||--o| SessionAttendance : fact
  SessionAttendance ||--o| AbsenceExcuse : may_have
  SessionAttendance ||--o{ AttendanceCorrection : corrected_by
  InitiativeMembership ||--o{ InitiativeCompletion : evaluated
  Initiative ||--o{ Form : owns
  Form ||--o{ FormVersion : publishes
  FormVersion ||--o{ FormResponse : answered
  Initiative ||--o{ Competition : owns
  InitiativeApplication {
    bigint Id PK
    bigint InitiativeId FK
    bigint PersonId FK
  }
  InitiativeSeat {
    bigint Id PK
    bigint InitiativeId FK
    smallint SlotNo
  }
  SessionAttendance {
    bigint Id PK
    bigint RegistrationId FK
    nvarchar Status
  }
```

The Initiative admission seat, Session mode seat, factual Attendance and Initiative Completion are four different facts. Seat slots and active Supervisor appointments enforce separate approved operational limits.
