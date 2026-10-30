# Conceptual domain model and aggregate boundaries

Each subgraph is an aggregate boundary; edges across boxes carry IDs/events, not an eagerly loaded object graph.

```mermaid
flowchart TB
  subgraph Identity
    Person[Person]
    Email[VerifiedEmail]
    Person --> Email
  end
  subgraph Institution
    Inst[Institution] --> Init[Initiative]
    Init --> App[Application]
    Init --> Seat[Seat]
    Init --> Mem[Membership]
  end
  subgraph IndependentCoach
    Coach[Coach Person] --> Prog[Coach Program]
  end
  subgraph Work
    Group[Operational Group XOR parent] --> Assignment[Assignment]
    Assignment --> Recipient[Recipient]
    Recipient --> Submission[Submission]
    Submission --> Review[Review Decision]
  end
  subgraph Sessions
    Session[Session] --> Registration[Registration]
    Registration --> Attendance[Factual Attendance]
    Attendance --> Excuse[Excuse Decision]
    Mem --> Completion[Initiative Completion]
  end
  subgraph Provider
    ProviderRoot[Provider] --> Experience[Experience]
    Experience --> Booking[Booking]
    Booking --> Offer[Seat Offer]
    Booking --> Camp[Camp Completion]
  end
  subgraph Personal
    Profile[Individual Profile] --> Journey[Recovery Journey]
    Journey --> Cycle[Recovery Cycle]
    Cycle --> Revision[Plan Revision]
    Lab[Assessment Attempt]
    Practice[Practice Attempt]
    Shield[Browser Usage Period]
  end
  subgraph Evidence
    Event[Evidence Event] --> PersonalLedger[Personal Reward Ledger]
    Event --> GroupLedger[Group Reward Ledger]
    PersonalLedger --> PersonalScene[Personal Garden Projection]
    GroupLedger --> GroupScene[Group Garden Projection]
  end
  Person --> App
  Person --> Booking
  Person --> Profile
  Init --> Group
  Prog --> Group
  Attendance --> Event
  Review --> Event
  Camp --> Event
  Practice --> Event
  Lab -. source-labeled insight .-> Journey
  Shield -. source-labeled insight .-> Journey
```

The two incoming parent arrows to Group mean **exclusive OR**, never simultaneous ownership. An Initiative can link an independently owned Program or Experience by accepted partnership without moving its Group or Booking aggregate.
