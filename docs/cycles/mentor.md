# Mentor / Coach cycle

> **Dated audit, not the target contract (15 October 2026).** Routes, fields, tests and code observations below describe the inspected working tree. The [authoritative v4.0 master](../../DeepSprout.md) and its [decision register](../../DeepSprout.md#26-decision-register-authoritative-interim-and-open) govern all implementation targets, including decisions approved after this audit.

**Evidence:** `Client/src/workspaces/pages/mentor.js:1-41`, `builders/program.js:1-11`, `commands/mentorship.js:2-35`, `data/mentorship.js:2-10`, `shared.js:1-51`, `navigation.js:4`, `pages/auth.js:1-36`; later approved behavior in [master §13](../../DeepSprout.md#13-coach--mentor-program-and-shared-assignment-engine). Routes below are under `workspaces.html#/mentor/`. A Mentor is scoped to owned groups/programs; group membership does not expose private Individual Lab, Shield or Recovery Plan data. Current `ownGroups`/command checks are browser-local.

## Current page-by-page inventory

| Route / navigation | Displayed sections and actions in order | Actual status and required result |
|---|---|---|
| `dashboard` / Dashboard | Welcome/hero, create group/open programs, metrics, reviews/invitations/next actions; first-use Create Your First Group empty state. | **WC local:** counts and links from partner store. Desired source-qualified due/review queue, notices and accessible Individual/Student handoff. |
| `groups` / My Groups | Header/Create, search and Open/Archived filters, owned group cards (purpose, members/capacity/status), empty/no-results. | **WC local:** create, edit/archive via modal/commands. |
| `groups/:id?tab=overview` | Group heading/status, shared intention, member/capacity, current program. | **WC local**; no private assessments. |
| `groups/:id?tab=members` | Member table with permitted work and Remove; pending admission table with Approve membership. | **WC local** membership changes; explicit rejection control is **missing**. No real invitation delivery or server privacy. |
| `groups/:id?tab=invitations` | Invitation table with token, expiry, uses/limit, Copy link, Preview, Revoke, Create invitation. | **WC/MS:** token/OTP and reuse are local; link can reach `join.html?token=…`. |
| `groups/:id?tab=programs` | Linked program timeline and detail links or create empty state. | **WC local** partner program versions. |
| `groups/:id?tab=activity` | Assignment/due/approved-count table. | **WC local** from group assignments/submissions. |
| `groups/:id?tab=settings` | Enrollment/capacity summary, Edit and Archive. | **WC local**; archive retains history. |
| `students`, `students/:id` / My Students | Own-group member list/search; detail identity, group and submission history with privacy note. | **WC local:** only `memberIds` from owned groups render. Full Individual account is a different identity/store. |
| `programs` / Programs | Header/Build, status-filtered program list; detail links. | **WC local**, draft/published versions. |
| `programs/new`, `programs/:id/edit` / Program Builder | Five-step form, Save Draft/Back/Next/Publish; draft recovery and validation. | **WC local:** publish generates assignments; no regular Individual task surface. |
| `programs/:id` | Version/status, stages, groups, assignments; duplicate/close/archive controls. | **WC local**; published version pinned. |
| `assignments` / Assignments | Header/Create, list by group/activity/due/status, action/detail links. | **WC local** to Student tasks; personal Recovery Plan activity is separate. |
| `reviews`, `reviews/:id` / Reviews | Submitted/revision queue; detail submission/evidence/feedback/history, Approve/Needs Revision/Reject. | **WC local** Student progress and one source-linked group reward; no regular Individual notification/history. |
| `group-garden` / Group Garden | Group selector, one illustrative shared plant, qualifying memory list/empty state. | **WC local**, deduplicated by source; **historical local rendering:** one plant differs from the later approved ownership/visual policy; the Group Garden itself is approved. No reward threshold adopted. |
| `reports` / Reports | Group/program/date filters, source-qualified table/chart and Export CSV. | **WC local** report projection; a due-date range is used for Mentor reports (`shared.js:30-44`). |
| `notifications` / Notifications | Shared local notice list/read actions (`shared.js:19-29`). | **MS:** no delivery. |
| `profile`, `account` / Profile & settings | Shared account form, identity and workspace access. | **WL** partner identity; no connection to regular Individual Profile. |

`mentor` application uses partner account, simulated OTP, Mentor-specific professional profile, review and Admin approval (`pages/auth.js:3-36`, `commands/platform.js:2-42`). Application fields: professional title*, specialization*, years of experience* (0–80), focus*, biography*, relevant experience*, topics*, contact phone*, optional document names; common identity fields are listed in [Institution entry](institution.md). Admin approval grants local Mentor workspace. Rejected/needs-info/suspended states have local status screens.

## Exact fields and actions

| Workflow | Current fields, defaults, validation and write |
|---|---|
| Group create/edit | Group name* (blank), purpose* (blank), description, capacity* (12; 1–200), enrollment Invitation/Approval required (Invitation), require Mentor approval checkbox, status from command. Writes `groups`; owner is current Mentor ID. Missing policy: age/consent and invitation sharing control. |
| Invite / admission | Restrict-to-email (optional, blank), invitation expires* (`2026-12-31`), maximum uses* (10; 1–100); Copy link/Preview/Revoke; pending member Approve only. Writes `invitations`, `memberships`, `groups.memberIds`. Simulated OTP `246810`; expiration/use/capacity checked locally. |
| Program step 1 | Title*, description*, purpose*, digital-wellbeing focus* (Balanced technology use), duration days* (14; 1–365). |
| Program step 2 | Owned target groups multi-check, start* `2026-10-14`, end* `2026-10-28`. |
| Program step 3 | Repeated stage title*, objective/milestone*, date*; Add/Move/Remove. |
| Program step 4 | Published activity catalog multi-check, required toggle (on), evidence review select Mentor review. Step 5 is read-only preview/publish. Writes `programs`, generated `assignments`. The catalog belongs to partner Admin store, not legacy published Activities. |
| Direct assignment | Assignment title* (blank), Group (first owned group), optional Individual member (Whole group), Approved activity (published partner catalog), Instructions* (blank), Expected evidence (`Short written reflection.`), Due date* (`2026-10-28`), Required assignment (on). Review is fixed `Mentor review`; creates `assignments`. Ownership/group checks are local (`mentor.js:32-39`). |
| Review | Approve/Needs Revision/Reject and feedback text in review modal; writes `submissions.status/feedback`, source-linked `rewards` for eligible approval. File evidence is a filename preview, not an upload. |
| Reports/account | Resource/program/date selectors, CSV export; shared account name/email and local notice controls. Reports are derived, not separate authoritative completion records. |

Action handlers live in `mentor.js:37-41`; `builderAction` in `builders/engine.js:6-10` captures steps and dispatches `mentor.program.save/publish`; `commands/mentorship.js:2-35` validates owner, membership, dates and review transitions. Meaningful create/invite/publish/submit/review controls are **WC within the partner store**. Copy link, OTP, notifications, file name and focus timer are **MS**. Regular Individual task/notification/Garden propagation is **BR/MI**. Search/no-results and first-use pages exist; draft/published/archived, assigned/in progress/submitted/needs revision/approved/rejected states exist locally. Real mail failure, conflicting version, paused program, delivery, and full expired task lifecycle are missing/unverified.

## Expected cycle and acceptance

Approved Mentor → owned group → revocable invite → verified Student joins or waits for approval → five-step versioned program → generated assignment → Student sees only their work → submission → Mentor reasoned review/revision → source-linked completion → reports and eligible achievements. A full Individual invited to the same group must preserve their existing identity and see assigned work without exposing private assessments or merging it into their personal Recovery Plan. The latter bridge is missing. `student/protected-work/:assignmentId` is a local timer and self-report, never actual site blocking or automatic approval. Final backend must supply secure invitation/authorization and durable review evidence; the static demo needs a coherent single-person mapping and visible tasks/history/notifications now.

Demo B can run wholly inside partner Mentor/Invited Student pages according to the domain tests and existing browser-test source, but this audit did not rerun that browser sequence. For the specified full Individual consequences, it fails at identity/task integration. Remaining detail questions: system-scored review policy, invitation expiry/use defaults, program pause/cancel semantics and reward thresholds. Group Garden ownership, same-identity upgrade and assigned-task sharing are approved in the master. See [Student](invited-student.md), [Individual](individual-integration.md), [gaps](gaps-and-decisions.md).

## Approved target correction

Independent Coach Programs are invite-only and own their Groups; an Institution-invited Coach needs no separate Admin approval and works only with allocated Initiative Groups. Every Group has exactly one Initiative **or** Program parent and uses one shared assignment/review engine. Coach reports feed source-computed Supervisor Insights and Representative reports. There is one Initiative-wide Group Garden, or one per independent Coach group, with no duplicate Personal reward. See [master §13](../../DeepSprout.md#13-coach--mentor-program-and-shared-assignment-engine).
