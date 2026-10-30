# System domain context map

Solid arrows represent authoritative data/events; dashed arrows are scoped read projections. All boxes run inside the proposed modular monolith and one SQL Server database.

```mermaid
flowchart LR
  IAM[Identity & Access] --> IND[Individual + Onboarding]
  IAM --> INST[Institution + Admission]
  IAM --> COACH[Coach + Groups]
  IAM --> PROV[Provider]
  IAM --> GOV[Governance]
  LAB[Lab] --> REC[Recovery]
  ACT[Activities] --> REC
  SH[Shield] --> REC
  INST --> SESS[Sessions + Attendance]
  COACH --> TASK[Shared Assignments]
  INST --> TASK
  PROV --> BOOK[Bookings + Camps]
  INST --> LINK[Partnerships]
  COACH --> LINK
  PROV --> LINK
  ACT --> EVID[Evidence + Rewards]
  TASK --> EVID
  SESS --> EVID
  BOOK --> EVID
  EVID --> INS[Insights + Reporting]
  LAB --> INS
  REC --> INS
  SH --> INS
  INST --> INS
  PROV --> INS
  GOV --> ACT
  GOV --> LAB
  GOV --> EVID
  EVID --> OPS[Audit + Outbox + Notices]
  INST --> OPS
  TASK --> OPS
  BOOK --> OPS
  COMM[Community] --> OPS
  ENT[Entitlements] -. feature allowance .-> IND
  ENT -. feature allowance .-> INST
  ENT -. feature allowance .-> PROV
  LINK -. permitted projection .-> INS
```

Identity supplies a subject, not an automatic resource grant. Entitlements affect capability limits only after authorization. Community engagement is not a reward source. Personal Lab/Shield/Recovery data do not flow into partner operational reports by default.
