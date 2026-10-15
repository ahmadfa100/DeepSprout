# Data flow, records and integration boundaries

> **Dated audit, not the target contract (15 October 2026).** Routes, fields, tests and code observations below describe the inspected working tree. The [authoritative v4.0 master](../../DeepSprout.md) and its [decision register](../../DeepSprout.md#26-decision-register-authoritative-interim-and-open) govern all implementation targets, including decisions approved after this audit.

## Actual browser stores and owners

| Key / seed | Code | Writers → readers | Current boundary |
|---|---|---|---|
| `deepsprout-ecosystem-demo-v1` from `src/workspaces/data/{mentorship,institution,outdoor,platform}.js` | `src/workspaces/store.js:10-43`, `models.d.ts:1-33`, commands/pages | Partner entry, Mentor, Student, Institution, Provider, Supervisor, Partner Participant, workspace Admin → same role pages/reports | Coherent **within** this browser-local ecosystem; not read by regular Individual or legacy Admin. |
| `deepsprout-account-changes-v1:<seed choice>` plus `src/data/demo-account.json`, `empty-account.json`, `listings.json`; `deepsprout-account-choice` session key | `src/js/data/account.js:1-117,181-187,752-853,977-1044` | Individual pages → Individual pages; legacy Admin reads a current-member preview | Opportunity catalog and registrations are independent of partner records. |
| `deepsprout-user-v1` | `src/js/utils/storage.js:13,73-104` | Individual Register/Login/Onboarding/Starting Point → older first-run screens | Separate from account results/active plan; first-run activation issue found in the earlier audit; current end-to-end state needs a new browser check. |
| `deepsprout-admin-demo-v1`, `deepsprout-admin-demo-session` | `src/admin/store.js:2-4,69-83` | Legacy Admin → legacy Admin; published activities to Individual Activities; CMS to landing | Separate Admin record graph; selected explicit Individual bridges. |
| `deepsprout-community-demo-v1` | `src/pages/member/community/community.js:15-22,166`, `src/admin/community.js:2-21` | Member post/report → legacy Admin moderation → member feed | A working local bidirectional island; workspace Admin moderation does not use it. |
| Profile, Shield, training and UI preference keys | `profile.js:6-8`, `shield.js:41-58,277-280`, `training.js:33-37`, `garden.js:28,404` | Individual-only components | No partner relation. Session keys include Garden entrance replay and Shield focus timer. |
| Sidebar/notification-read keys | `src/admin/app.js:22,29-39` | Legacy Admin UI only | Presentation state, not authoritative notifications. |

All stores are editable by the browser user, and `storage` events/route re-renders do not create a shared entity contract. `workspaces.store.dispatch` clones/validates/persists state; domain tests cover some invariants (`store.js:19-43`). The Individual account replays change events on JSON seeds (`account.js:106-117`). Reset commands have different scopes. Never infer a successful handoff from matching titles in independent seeds.

## Resource contracts as implemented

The table records actual source of truth and core identifiers/fields, readers and writers. Status lists are observed code/model values; other future states belong to desired specification. Partner arrays all live in the single ecosystem key; legacy/member equivalents are **different records**.

| Resource | Current owner, IDs/fields/status | Writers → readers and break |
|---|---|---|
| Person/Application/Entity | `people.id/email/workspaces/status/verified`; `applications.id/personId/type/details/files/messages/status`; `organizations/providers.id/memberIds/status`; status Draft/Submitted/Pending Verification/Needs More Info/Approved/Rejected/Suspended (`models.d.ts:1-20`). | Auth and workspace Admin → partner access. Existing-person reuse only inside partner people. No Individual account ID mapping. Approval does not validate files (names only). |
| Group/Invitation/Membership | `groups.id/ownerId/memberIds/capacity`; `invitations.groupId/token/expires/limit/uses`; `memberships.groupId/personId/status`. | Mentor → Join/Student. Expiry/capacity/ownership local; no full Individual group view. |
| Program/Assignment/Submission/Review | `programs.id/ownerId/groupIds/version/stages`; `assignments.id/groupId/programId/stageId/studentId/due`; `submissions.assignmentId/studentId/status/history`; one reward keyed to approved submission source. | Mentor Builder/Review ↔ Student tasks/progress/report. Full Individual and personal Recovery Plan separate. Report is a projection, not the original submission. |
| Initiative/Component | `initiatives.id/ownerId/status/version/components.resourceId`; Institution owns. | Institution Builder → Partner Participant discovery/detail; regular Explore uses `listings.json` IDs. Draft/Published/Closed/Archived/Cancelled/Suspended govern partner visibility. |
| Initiative Enrollment | `enrollments.id/initiativeId/personId/status/created`. | Partner Participant join/cancel → Institution Participants/Reports. **Does not reserve** a Session/Provider seat. Regular Individual `registrations` are unrelated. |
| Session/Registration | `sessions.id/initiativeId/ownerId/format/onlineCapacity/inPersonCapacity/status`; `sessionRegistrations.sessionId/personId/mode/status/attendance/completion`. | Institution creates/publishes/confirms; Partner Participant registers. Online and in-person pools local. Individual Explore session registration separate and does not update Institution. |
| Form/Response | `forms.id/initiativeId/ownerId/version/questions/versions/anonymous`; `responses.formId/version/personId|null/answers`. | Institution builder/publish → Partner Participant response → Institution versioned table/report. File questions preserve filename only. No regular Individual form view. |
| Competition/Entry | `competitions.id/ownerId/criteria/judgeIds/status`; `entries.competitionId/personId/text/scores/feedback/status`. | Institution publishes/judges; Partner Participant enters. No regular Individual entry. |
| Experience/ExperienceSession | `experiences.id/ownerId/status/capacity/registrationOpen/Close`; `experienceSessions.experienceId/date/time/criteria`. | Provider Builder → Partner Participant discovery and Supervisor schedule. Regular Explore experience listings are independent. |
| Booking/Offer | `bookings.id/experienceId/personId/status/credential`; `offers.bookingId/experienceId/personId/expires/status`. | Partner Participant book/accept/cancel ↔ Provider registrations/waitlist. Local `seats/occupied/offerNext` and expiry on read (`domain.js`, `store.js:22`). No Individual↔Provider bridge or multi-user transaction. |
| Appointment/Cohort | `appointments.experienceId/personId/sessionIds/cohortPermission/status`; `cohorts.experienceId/supervisorId/memberIds/status/token`. | Provider appoints/revokes → Supervisor accepts/manages confirmed-booking cohort → Partner Participant cohort. No Institution appointment implementation. |
| Attendance/Evaluation/Closing report | `attendance.experienceId/sessionId/personId/status/method/actorId`; `evaluations` by person/session/outcome; `closingReports.experienceId/supervisorId/status`. | Provider/Supervisor → Provider reports and Partner Participant completion; separate records prevent equating booking with attendance or completion. No regular Individual evidence. |
| Partner notices, rewards, audit | `notifications` read flag; `rewards.sourceId/personId/groupId`; `audit.actorId/action/resource/reason/result`. | Commands/role pages → local notices/Gardens/reports. Reward source dedup exists; no regular Garden import. Audit browser-editable. |
| Legacy activities/content/community/subscriptions | Separate legacy IDs and arrays; published guide/content and member moderation use explicit cross-key readers. | Legacy Admin → regular Activities, public landing, member Community. Workspace Admin catalog/CMS/moderation are parallel definitions with different recipients. |

## Three critical relationship chains

1. **Institution → Initiative → Session → Registration → Attendance:** Partner commands and pages preserve distinctions. Regular Explore creates its own registration event, so Institution Participants/Reports cannot observe it. A published Initiative can be locally valid and still absent from regular Explore (runtime verified).
2. **Provider → Experience → Booking → Appointment → Completion:** Local Provider/Participant/Supervisor pages share IDs. Individual listing/booking and Profile/Garden do not. Cancellation can offer a seat locally, but the regular Individual will see neither offer nor changed capacity.
3. **Mentor → Group → Program → Assignment → Submission → Review:** Local Mentor/Student pages share IDs and a source-deduplicated reward. Full Individual identity and tasks are separate. `account.upgrade` only sets `person.individualHandoff=true` (`commands/platform.js:34`); opening onboarding does not transfer records.

## Shared frontend demo model options — recommendation, not implementation

| Option | What it entails | Trade-off |
|---|---|---|
| **A. One canonical in-browser domain graph with projections (recommended)** | Keep stable person/resource IDs; partner commands write original records; Individual Explore/Profile/Insights/Garden read projections and append domain events through one contract. Legacy Admin publishers use explicit adapters until unified. Define schema migration/reset. | Most coherent static demo; requires careful migration of current seeded/member state and ordered implementation. Still not secure or multi-user. |
| B. Adapter over existing keys | Resolve person/listing IDs and translate commands between ecosystem, account and legacy stores; one designated owner per resource. | Smaller initial changes, but mapping and partial-write failure complexity grow quickly. Must avoid dual authoritative copies. |
| C. Local service/API-shaped facade over one browser store | Expose methods/events resembling future API without backend, while all pages share one implementation. | Clear future seam; more up-front work but testable. Can be combined with A. |

Required contract decisions before coding: identity mapping (especially Student upgrade), entity/version IDs, ownership and status transitions, projection invalidation, event IDs/idempotency, notification targeting, source-qualified participation evidence and Garden achievement types. The later Angular/ASP.NET/EF Core/SQL Server architecture must enforce authentication, scoped authorization, transactions, concurrency, durable delivery and audit; it is **not** a prerequisite for the static demo's coherent visible behavior.

## Approved data-model correction

For the target, one Person ID spans regular Individual and partner workspaces; one original Initiative/Program/Experience owns each resource. Each operational Group has exactly one Initiative **or** independent Coach Program parent. Phase-1 FormResponse has a verified person reference (no anonymous survey). Application, SessionRegistration, Booking, factual Attendance, ExcuseDecision, Completion and Reward are separate. Initiative caps are 135 accepted students and three active Supervisors **per Initiative**. Source-qualified projections must reach regular Explore, Activities → Assigned, My Initiatives/Registrations, Insights and the correct Garden. The historical store table above still describes current code. See [master §22](../../DeepSprout.md#22-phase-1-demonstration-and-eventual-technical-architecture).
