# 02 — Requirements traceability

`A/G/I/R/O/C` have the meanings in the package README. Table names refer to [07](07-database-schema.md); scenario letters to [13](13-validation-scenarios.md). IDs from the master are deliberately retained.

| Master source / ID | Status | Capability / decision | Owner and tables | Invariant / verification |
|---|---|---|---|---|
| §§2,14,23; D15,D45 | A | One person, many workspaces; Student upgrade | Identity `Person`, `PersonEmail`, `GlobalGrant`; scoped grants in owner contexts | One Person ID; invitation reuse, revocation; E,F,H |
| §§2–3; D21–D24 | A | Verified, scoped invites; no self-issued Supervisor/Admin | Identity `OtpChallenge`; `InitiativeStaffInvitation`, `ProgramGroupInvitation`, `ProviderStaffInvitation` | Hash token/OTP, email match, expiry, accepted once; E,F,H |
| §4; D04,D43 | A | Four baselines before personal activation, weekly official recheck | Lab `InstrumentVersion`, `AssessmentAttempt`, `AssessmentWindow`; Recovery `OnboardingProgress` | Valid/versioned attempts; no fifth test or fake score; A |
| §§4–5; D05 | A/G/O | Weekly eligibility; exact window/protocol open | Lab `AssessmentWindow`, `AssessmentAttempt` | Window policy version; comparisons gated; A |
| §5 | G/I | 28-day first cycle, future-only adaptive weeks | Recovery `RecoveryCycle`, `PlanRevision`, `ScheduledAction`, `WeeklyReview` | History immutable; initial 28-day value configurable; A |
| §§6,24 | A/G/O | Two Shield capabilities within supported browser | Shield `ShieldConfiguration`, `ProtectionSession`, `BrowserUsagePeriod` | No phone/Reels-only inference; consent/coverage; A,F |
| §7; D44 | A/G | Four practice types plus self-reported routine | Activity `PracticeVersion`, `PracticeAttempt`, `OfflineRoutine`, `RoutineCheckIn` | Validity/versions distinct from Lab; A,C |
| §§9–10; D06–D13,D46 | A/O | Four Personal trees, bounded decoration, distinct Group Gardens, source-qualified metrics | Reward `EvidenceEvent`, `PersonalRewardEntry`, `GroupRewardEntry`, `GroupGarden`; Reporting views | Unique source/effect; no quiet-day decay; correction compensation; A,C,G |
| §§11,15; D17,D20,D39 | A | Institution owns published Initiative; regular Explore uses original ID | Institution `Initiative`, `InitiativeRevision`; public read model | Draft hidden; no per-Initiative Admin approval; B |
| §§13,15; D19,D29–D33 | A | Initiative group XOR Coach Program group; shared assignments and Program completion | Coach `CoachProgram`, `ProgramCompletion`, `OperationalGroup`; task `Assignment`, `SubmissionAttempt`, `ReviewDecision` | Parent XOR, handover history, no duplicate task engine; B,C,E |
| §15; D25–D28 | A/I | One approval, ≤135 accepted, ≤3 active supervisors; suspension retains seat interim | Institution `InitiativeApplication`, `InitiativeSeat`, `InitiativeMembership`, `InitiativeStaffAppointment` | Slot allocation and active grant count transactional; B,G |
| §§15,17; D35–D38 | A/O | Registration, factual attendance, excuse, completion separate | Session `SessionRegistration`, `SessionAttendance`, `AttendanceCorrection`, `AbsenceExcuse`, `InitiativeCompletion` | Absent + accepted excuse remains Absent; active Supervisor gate; B,G |
| §§2.1,11,17 | G/R | Institution Session may stand alone; proposed named Supervisor appointment | Session `Session`, `StandaloneSessionSupervisorAppointment` | Exact session scope and no borrowed Initiative grant; standalone flow requires owner sign-off before implementation |
| §16; D27,D40 | A/I/O | Provider ownership; queued/offered/accepted lifecycle; 24h interim | Provider `ExperienceBooking`, `ExperienceSeat`, `SeatOffer`, `CampCompletion` | Held + confirmed ≤ capacity, expiry/reoffer; D |
| §§15,18; D40 | A/O | Accepted cross-owner links with agreed data scope | Partnership `ProgramLink`, `ExperienceLink` | Original owner/resource IDs retained; B,D |
| §§15,24; D41 | A/O | Identified versioned forms; restricted attachments | Forms `FormVersion`, `FormResponse`, `FormAnswer`, `SecureFile` | No anonymous Phase-1 survey; consent and retention; B |
| §§12,19 | A/O | Community and one Admin workspace | Community `Post`, `ModerationDecision`; Governance `ContentRelease`, `GovernanceAction` | No social reward; audited publish/moderation; F,H |
| §20 | G/O | Entitlements separate from permission; pricing undecided | Commercial `PlanVersion`, `Subscription`, `EntitlementAllocation` | No role purchase; no fabricated price or payment processor; F |
| §§22–24; D01–D03,D47–D48 | A/G | Production SQL/EF target, scoped auth, audit, notices | Infrastructure `AuditEvent`, `OutboxMessage`, `Notification`, `IdempotencyRecord` | API guard and durable transactional outbox; all scenarios |

No row converts a recommendation or an illustrative numeric example into an approved rule. See [15](15-open-questions-and-risks.md) for unresolved policy and source conflicts.
