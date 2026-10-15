# Outdoor Provider cycle

> **Dated audit, not the target contract (15 October 2026).** Routes, fields, tests and code observations below describe the inspected working tree. The [authoritative v4.0 master](../../DeepSprout.md) and its [decision register](../../DeepSprout.md#26-decision-register-authoritative-interim-and-open) govern all implementation targets, including decisions approved after this audit.

**Evidence:** `Client/src/workspaces/pages/provider.js:1-35`, `builders/experience.js:1-11`, `commands/outdoor.js:2-25`, `domain.js:1-23`, `shared.js:30-51`, `data/outdoor.js:1-10`, `navigation.js:7`; desired §16. Routes use `workspaces.html#/provider/…`. Provider owns an Experience even when an Institution links it; institution reports receive aggregates only. Current scope is simulated in `store.js:35-43`.

## Current page-by-page inventory

| Route / nav label | Sections in display order; data and actions | Current assessment and needed demo effect |
|---|---|---|
| `overview` / Overview | Provider hero/Create, published/confirmed/offer metrics, next operations and recent records. | **WC local** store projection; regular Individual unaware. |
| `experiences` / My Experiences | Header/Create, search/status filters, cards with owner, dates, occupied/available seats and detail; empty/no-results. | **WC local** from owned experiences. |
| `experiences/new`, `experiences/:id/edit` / Builder | Six steps, Save Draft/Back/Next/Publish; session editor; preview. Edit Draft only. | **WC local**; `builder.save` and `provider.experience.save/publish`; **BR** regular Explore publication. |
| `experiences/:id` / detail | Hero/status, description, venue/safety/completion, session timeline, booking counts, Publish/Duplicate/Close/Cancel/Archive and appoint Supervisor. | **WC local** state/operations; stale Individual listing and no regular notices. |
| `calendar` / Calendar & sessions | Experience selector and scheduled session cards with date/time/venue and attendance links. | **WC local** schedule; no external calendar. |
| `registrations` / Registrations | Experience selector, status filter, booking table/reference and Details, Approve or Cancel. | **WC local** partner bookings, independent of regular Individual registration. |
| `waitlist` / Waiting List | Experience selector, active offers with expiry, ordered waitlist/booking rows, issue/expire/participant preview controls. | **WC/MS:** held offers, cancellation and expiry are local; no cross-device capacity guarantee or real notification. |
| `supervisors` / Supervisors & staff | Appointment table with person/experience/session scope/status, Assign/Revoke and staff duty evaluation. | **WC local** accepted appointment gates Supervisor pages; no independent Provider staff capability model beyond appointment/scope. |
| `partnerships` / Partnerships | Institution requests table, Accept/Decline/Link experience/End. | **WC local** shared partnership; only Provider may link its own published experience. |
| `attendance` / Attendance | Experience/session selector, eligible roster, Demo credential or manual exception, Correct record/history. | **WC/MS:** per-session records; credential string is not signed QR. Shared operational renderer `shared.js:47-51`. |
| `evaluations` / Evaluations | Attendance-qualified completion table and outcome modal; voluntary participant feedback and staff operational evaluation panels. | **WC local** session evaluation; feedback only in partner store. Participant's regular history/Garden unchanged. |
| `reports` / Reports | Experience/date selection, counts/chart/table, CSV; Supervisor closing reports. | **WC local** projection from bookings/attendance/evaluations and closing reports. |
| `profile` / Provider profile | Public/operational description, email/phone/city/safety contact form, approved profile details. | **WC local**; no regular Individual organizer profile. |
| `account` / Account | Shared partner account and access form. | **WL**, separate from Individual identity. |

Entry: `auth/account/provider` → `auth/verify/provider` → `auth/application/provider` → status → `admin/providers/:id` approval. Provider application has entity name*, description*, categories*, areas*, city*, phone*, safety contact*, representative name* and position*, plus common person/email/password/birth year/consent and optional file names (`pages/auth.js:3-36`). It saves a draft/review/submission; approval creates an empty Provider entity and workspace membership. Verification and document handling are simulated. No actual staff invitation/permission page is present; “Supervisors & staff” chiefly manages appointments.

## Exact current builder and operation fields

| Step/workflow | Actual fields, initial values and validations |
|---|---|
| 1 Experience Basics | Title*, type Experience/Camp (Experience), category* (`Guided walking`), description*, objective*. Cover is fixed approved image. |
| 2 Location & Schedule | Venue*, address*, city* (Ajloun), country* (Jordan), start/end dates* (`2026-10-24`), timezone displayed Asia/Amman; repeated session title*, date*, venue*, start/end times*, optional description, completion criterion*. Add/reorder/remove; Camp needs at least two sessions, Experience at least one. |
| 3 Audience & Capacity | Capacity* 12 (1–1000), minimum age* 18 (0–120), registration opens/closes* (`2026-10-14`/`2026-10-23`), eligibility*, conditions*, approval-required (off), waitlist-enabled (on), cancellation policy*. |
| 4 Safety & Registration | Operator/emergency contact*, safety instructions*, consent text*, attendance-method select (one Demo credential/manual option), completion criteria*. No medical data form or actual safety document upload. |
| 5 Staff & Partnerships | Potential staff `personId` multi-check from active demo people; partnership link from separate request page. Step 6 preview is read-only. Staff selection does not itself create an accepted Supervisor appointment. |
| Appointment modal | Owned experience, existing person, assigned session IDs, cohort permission, scope text. Writes `appointments` Invited; invitee Accepts/Declines. Resource/session authority is checked locally. |
| Booking and waitlist | Partner Participant booking asks age* and consent; Provider Details/Approve/Cancel actions. Active offer holds seat; accept/decline/expire from Participant booking page. Reference/credential is local string. |
| Attendance/evaluation | Demo credential text* or manual reason*; correction reason*; completion outcome Completed/Needs follow-up/Not completed and evidence notes*. Provider staff duty evaluation: outcome select and notes*. Writes separate `attendance`, `evaluations`, `staffEvaluations`. |
| Profile | Description, official email*, official phone, headquarters city, safety/operational contact*. |

Command guards include owner, published state, registration window, capacity, duplicate booking, offer expiry and separate attendance/completion (`commands/outdoor.js:2-25`, `domain.js:1-23`). Local tests passed cancellation → offer → decline/expiry → accept without overbooking. They do not establish real multi-user atomicity. Report rows are derived from original records (`shared.js:30-44`). Missing validation includes verifiable organizer/license/safety documents, accessibility/age consent policy, delivery/receipt of offers, signed check-in credentials, incident escalation, and actual staff role grants.

## Action and state ledger

Publish/Duplicate/Close/Cancel/Archive are **WC local** to partner discovery; no regular Explore update or Individual notice. Book/Approve/Cancel/Waitlist/Issue/Accept/Decline/Expire are **WC local** with simulated delivery and in-browser seat holds. Appointment and operational actions are **WC local** Provider↔Supervisor. Credential check-in is **MS**. CSV and filters are **WL** report tools. Current states include Draft/Published/Completed/Cancelled/Archived Experience, Pending Approval/Confirmed/Waitlisted/Seat Offered/Checked In/Completed/Cancelled booking, Invited/Accepted/Declined/Revoked appointment and Present/Corrected attendance. Empty/no-results screens exist for key lists; loading, failed delivery and offline reconciliation do not. The current offer-minutes setting is historical demo behavior. The later approved Phase-1 **interim configurable default is 24 hours** with a test/demo clock; exact production ordering/delivery remain open.

## Required journey and readiness

Approved Provider → draft Experience/Camp with venue, schedule, seats, eligibility, safety and session criteria → publish → **regular Individual Explore** → independent booking → Individual confirmation and Provider registrant list → full capacity waitlist → cancel/seat offer/accept or decline or expire → scoped Supervisor appointment → session attendance → criteria-based completion → Provider report + Individual participation history, notification and qualified Garden evidence. Institution links may show the Experience but do not own bookings or safety details. A cancellation or suspension removes availability while retaining history. Static demo can implement all visible transitions in one shared browser contract; final backend must own secure identity, transactional inventory/offer expiry jobs, reliable notices and credential integrity. Current partner-only journey is useful but fails Demo C at regular Individual discovery and reverse registration.

Open decisions: waitlist priority exceptions and delivery method, cancellation cutoff and future real refund rules, exact completion thresholds, Provider staff capability model, operational incident handling and booking form/consent scope. The 24-hour demo expiry is an interim configurable default, and eligible Camp completion unlocks a bounded birdhouse.

## Approved target correction

A Provider owns its Experience, booking, seats, safety and reports even when linked to an Institution. Phase-1 demo must show Queued→Offered→Accepted/Declined/Expired→reoffer, seat release and notices in regular Individual and Provider pages; use a configurable 24-hour default and test clock. In-person booking QR can be typed/pasted or manually checked with reason; online uses roster verification. Completion, check-in and rewards remain separate. No Provider camp/cohort Group Garden exists in Phase 1. See [master §16](../../DeepSprout.md#16-outdoor-provider-bookings-waiting-list-and-camp-completion).
