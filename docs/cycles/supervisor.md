# Supervisor cycle

> **Dated audit, not the target contract (15 October 2026).** Routes, fields, tests and code observations below describe the inspected working tree. The [authoritative v4.0 master](../../DeepSprout.md) and its [decision register](../../DeepSprout.md#26-decision-register-authoritative-interim-and-open) govern all implementation targets, including decisions approved after this audit.

**Evidence:** `Client/src/workspaces/pages/supervisor.js:1-15`, `shared.js:30-51`, `commands/outdoor.js:2-25`, `data/outdoor.js:1-10`, `navigation.js:8`; desired §17. A Supervisor receives a **resource-specific appointment** from a Provider, accepts it, and operates only the assigned experience/session/cohort. Current `assignedExperiences` and appointment checks are local simulation. No general Supervisor signup exists.

## Current page inventory

| Route / label | Actual sections and actions | State and required delta |
|---|---|---|
| `dashboard` / Dashboard | Hero; Invited appointment cards with Accept/Decline; accepted-experience/cohort/participant/report metrics and next sessions; unassigned empty state. | **WC local** appointment grants visible work. No real notification delivery. |
| `experiences`, `experiences/:id` / Assigned Experiences | Accepted appointment cards; detail with assigned session timeline, scope, safety/contact, Cohorts and Closing report links. | **WC local**; foreign ID gives missing screen. |
| `cohorts`, `cohorts/:id` / My Cohorts | Header/Create; cards/member counts, detail eligible roster, Edit members, scoped join-link copy, Group Garden link. | **WC local** for confirmed booking members only; cohort join link does not create booking. Link is simulated. |
| `participants` / Participants | Own-cohort names, booking status and session attendance/completion counts. | **WC local**; no private Lab/Shield/Recovery Plan. |
| `schedule` / Schedule | Experience selector and assigned session cards with time/venue/attendance link. | **WC local**; no live schedule messages. |
| `attendance` / Attendance | Experience/session selectors, eligible roster, credential/manual check-in, correction history. | **WC/MS** separate per-session record; demo credential is plain string, manual exception requires reason. |
| `evaluations` / Evaluations | Attendance-qualified participant/session criteria table, outcome modal. | **WC local** completion evidence; unrelated sessions filtered by appointment. |
| `group-garden` / Group Garden | Cohort selector, one illustrative plant and source memories. | **WC local historical Provider cohort plant**, which is outside the approved Phase-1 target; Provider cohorts have no Group Garden. |
| `reports` / Closing reports | Resource/date/cohort selectors, counts/chart/CSV, operational summary and exceptions form; submitted report shown in Provider Reports. | **WC local** projection plus saved `closingReports`; no regular Individual result. |
| `account` / Account | Shared partner identity/settings. | **WL**, distinct from Individual profile. |

No standalone Supervisor Notifications or Settings route exists in navigation. Provider `supervisors` owns appointment/revocation. Institution-initiated Supervisor access is an **approved target** but **not implemented** in this historical Provider-centric code. An invitation without accepted appointment allows the dashboard invitation, not unrelated operational resources (`store.js:24`, `shared.js`, `commands/outdoor.js`).

## Fields and control classification

Provider appointment fields are experience, existing person, selected session IDs, cohort permission and scope. Supervisor `Accept`/`Decline` changes appointment status (**WC local**). Cohort Create/Edit asks name*, description, assigned experience, capacity* (default experience capacity) and selected confirmed-booking member IDs; command rejects ineligible/unassigned participants and duplicate active cohort membership (**WC local**). “Copy scoped join link” copies a local token (**MS**). Attendance modal asks credential* or manual reason*; correction asks reason*; check-in changes `attendance` and booking state, locally. Evaluation modal selects Completed/Needs follow-up/Not completed and requires notes; completion record is separate. Closing report form asks operational summary* and exceptions/follow-up; Submit/Update persists in `closingReports`, Provider report reads it (**WC local**). Date/resource/cohort filters and CSV are local reporting controls. `shared.js:47-51` holds attendance/evaluation UI, `supervisor.js:13-15` handles cohort/report actions.

States confirmed by code: Invited/Accepted/Declined/Revoked appointment; Active cohort; Present/Corrected attendance; Pending evaluation/Completed/Needs follow-up/Not completed; submitted closing report. Empty/unassigned views exist. No secure QR camera flow, real credential replay resistance, delivery failure state, incident report workflow or reliable operational notifications. Physical attendance cannot be authenticated by this browser.

## Expected workflow and boundaries

Provider appoints Supervisor for specific camp and sessions → Supervisor accepts → only those sessions/eligible bookings appear → cohort membership selected from confirmed participants → authorized attendance recorded/corrected with reason → published session criteria evaluated → closing summary submitted → Provider sees operational report → regular Individual sees valid participation/completion and qualifying evidence, never fabricated cognitive improvement. A revoked appointment immediately stops new operations but retains audit/history. Supervisor cannot browse unrelated Provider or Institution records, other cohorts or private Individual data. An Institution-invited Supervisor receives an explicit Initiative-wide grant after verified invitation acceptance, without a separate Platform Admin approval. That grant covers all operational groups/students in that Initiative, never unrelated resources.

Current Partner Provider↔Supervisor report path is local-connected; Individual visibility is broken because partner attendance/evaluations never enter Individual account. Demo D can be reproduced locally with a seeded confirmed booking and accepted appointment, but must be retested through UI after integration. Final backend needs secure resource grants, signed/replay-safe credentials, multi-user attendance consistency and audit. Open details are correction/appeal, completion thresholds and incident escalation. Institution Supervisor authority, Group Garden ownership, attendance method and excuse decision flow are approved in the master.

## Approved target correction

Institution Supervisors may approve the same pending Application that the Representative sees and manage all Initiative groups/students, but may not reject/remove/suspend/restore/block, revoke staff or finalize excuses. Attendance needs an **active** authorized Supervisor; in-person QR has typed-code/manual fallback, online uses roster verification. Excuses are separate from factual Absent/Late/Present, with Supervisor recommendation and Representative final decision. Supervisor Reports become source-computed operational Insights. Provider Supervisor remains limited to assigned Provider sessions and has no Provider Group Garden. See [master §17](../../DeepSprout.md#17-supervisor-scoped-operations-attendance-excuses-and-insights).
