# Invited Student / limited participation cycle

> **Dated audit, not the target contract (15 October 2026).** Routes, fields, tests and code observations below describe the inspected working tree. The [authoritative v4.0 master](../../DeepSprout.md) and its [decision register](../../DeepSprout.md#26-decision-register-authoritative-interim-and-open) govern all implementation targets, including decisions approved after this audit.

**Evidence:** `Client/src/workspaces/pages/student.js:1-24`, `pages/auth.js:17-36`, `store.js:19-43`, `commands/mentorship.js:2-35`, `shared.js:1-29`, `navigation.js:5`; specification §14. The Student is a distinct limited workspace under `workspaces.html#/student/…`, entered by `join.html?token=…` → `#/join/:token`. The regular Individual account is a separate implementation and store.

## Current page inventory

| Route / label | Sections in order; controls | Status and required delta |
|---|---|---|
| `join/:token` and `?step=verify` (entry, no sidebar) | Group/program preview, Mentor, invitation validity; name/email/consent form; six-digit demo OTP, resend; invalid/revoked/expired/exhausted/full/already-joined/pending states. | **WC/MS:** `inviteState` guards token/use/capacity locally; `auth.join` reuses matching partner person, or creates one. No real email or secure session. |
| `dashboard` / My Dashboard | Welcome and group/Mentor, next task, metrics, recent guidance; empty task/group state. | **WC local** to Mentor assignments/reviews. |
| `tasks` / My Tasks | Header, search/status filter, cards with activity/due/required/status; empty/no-results. | **WC local** assigned work only. |
| `tasks/:id` / task detail | Instructions/evidence/due, optional Protected Work link, text submission and local file name, Mark in progress, feedback/history. | **WC local:** `student.task.start` and `student.submit`; submission appears in Mentor Reviews; revision/resubmission supported. File bytes are not uploaded. |
| `group` / My Group | Purpose, Mentor, program timeline, task cards; pending-admission empty state. | **WC local** own group, no other member submissions. |
| `garden` / My Garden | Shared group selector, single illustrative plant and source memories. | **WC local** group reward; conflicts with latest no-additional-gardens decision unless clarified. Not the fixed Personal Garden. |
| `progress` / My Progress | Counts and task history with evidence labels. | **WC local**; program participation is distinct from cognitive improvement. |
| `protected-work/:assignmentId` / task link | Intention field*, ten-minute local timer, Start/Pause/End and Write summary. | **MS:** local timer, no browser blocking, no automatic task approval. Route refuses nonassigned Protected Work. |
| `account` / Account & upgrade | Partner account details, memberships and “Upgrade to Full Individual” link. | **WL/BR:** link opens existing Individual onboarding; no identity bridge, so continuity into regular Individual data is not implemented. |

There are no separate Student Notifications or group-events pages in the current navigation (`navigation.js:5`); any notice is the shared partner notice surface and task feedback. No Student calendar, independent application, full Individual Lab, Shield or Recovery Plan is part of the limited workspace. The partner `participant` role is automatically added to verified people (`store.js:21,32`) so a Student may also use partner opportunity pages; that is not a full Individual upgrade.

## Fields, handlers and states

Invitation preview reads `invitations`/`groups`/`programs`. New join asks **name**, **email**, **consent**; verification asks **code** (`246810`), and can resend. Existing identity reuse is by email in the partner store only. `store.js:27-33` increments invitation usage and either creates pending `memberships` or appends `group.memberIds`; group owner later approves where required. Task detail asks required reflection text and optional local attachment name (`student.js:11-13,21`). Protected Work asks required intention, with duration default ten minutes (`student.js:15-20`). Student account form uses shared partner fields (`shared.js:1-18`). Submission changes persist on reload under `deepsprout-ecosystem-demo-v1`; status becomes Submitted, Needs Revision, Approved or Rejected through Mentor review. Draft/task-in-progress states are local to partner store. Permission denial for a foreign task renders missing task; that is a client-side view guard, not durable authorization.

Controls: Open task/Mark in progress/Submit/Resubmit are **WC local** through `student.js:20-22` and `commands/mentorship.js`; Start/Pause/End timer is **MS**; upgrade is **BR** for continuity; shared Garden is **WC local but policy-undecided**. Empty/no-results and pending admission screens exist. No credible loading, delivery-failure or identity recovery state is implemented.

## Expected journey and acceptance

Mentor issues scoped invite → Student sees minimal preview → verifies identity → joins or awaits approval → sees own tasks/group → submits → receives review/revision → own progress and source-qualified achievements update. Upgrade should attach full Individual access to **the same person**, retain group membership/assignments/submissions/reviews and qualified achievement evidence, then offer the four baseline assessments as a separate optional personal onboarding path. A Mentor cannot read private Individual Lab, Shield or plan data. A Student cannot read another Student's work. The static demo needs visible same-identity continuity; production later needs secure token/OTP/session and privacy enforcement.

Current local invitation/task/review loop is demonstrable in one ecosystem store (ten domain tests passed); the upgrade loop is not. Open details are age/guardian consent, notification delivery and retention after membership removal. The Student sees **only the separate Group Garden** before upgrade; same identity and assignment history must survive upgrade, and full Individual work appears in Activities → Assigned.

## Approved target correction

The limited Student has an authorized **Group Garden only**, no Personal Garden region. Upgrade to full Individual preserves person ID, membership, tasks, submissions, reviews and earned history, then offers the four personal baseline assessments separately. See [master §14](../../DeepSprout.md#14-invited-student-and-full-individual-continuity).
