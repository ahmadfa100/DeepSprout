# Role and resource permissions

> **Dated audit, not the target contract (15 October 2026).** Routes, fields, tests and code observations below describe the inspected working tree. The [authoritative v4.0 master](../../DeepSprout.md) and its [decision register](../../DeepSprout.md#26-decision-register-authoritative-interim-and-open) govern all implementation targets, including decisions approved after this audit.

**Legend:** `C` create, `R` read own/assigned, `U` edit, `P` publish/approve, `X` cancel/archive/suspend, `A` attendance/evaluate, `V` reports, `M` grant permissions; `—` deny. **Current** controls are browser-local route and command checks (`Client/src/workspaces/app.js:24-48`, `store.js:23-43`, `commands/*.js`) and must not be described as real authorization. The **target** below summarizes the approved core authorities from [master §23](../../DeepSprout.md#23-permissions-privacy-lifecycle-and-integrity-invariants); finer subroles still need policy definitions. Platform Admin governs platform access/content but does not become the operational owner of a partner booking. A person's multiple memberships do not merge their scopes.

## Current role reality

| Role | Current entry and effective scope | Missing/unsafe assumption |
|---|---|---|
| Platform Admin | Workspace Admin provisioned `p-leen`; legacy Admin separate demo flag. Workspace Admin can decide partner applications, statuses, catalog/CMS/policies. | No shared identity or server authorization; legacy data and partner data separate. |
| Institution Owner/Manager | Approved organization application or accepted team invitation; `orgFor` selects organization containing current person; Institution commands check ownerId. | `team.capability/scope` text is stored, but not consistently enforced per command. Multiple organization membership selection is not modeled clearly. |
| Institution Coordinator/Staff | Team invitation gives `organization` workspace and org membership. | Can effectively inherit broad organization command ability; per-initiative/facilitator/report-only limitations are proposed, not implemented. |
| Mentor/Coach | Approved Mentor application; group/program/assignment ownership by person ID. | Limited Student/full Individual identity split; no server privacy guarantee. |
| Invited Student | Valid invitation/OTP and group member IDs; own assignment/submission checks. | Full Individual upgrade does not unify identity; token/session only local. |
| Provider Owner/Manager | Approved Provider application, `providerFor` and experience owner checks. | Provider staff subroles not modeled; appointment is Supervisor-specific. |
| Provider Staff | No general staff role/permission page. | Proposed only; cannot assume all Provider users should see all bookings/safety data. |
| Supervisor | Invited/accepted appointment, session IDs and cohort permission; assigned-only rendering/commands. | Institution-delegated assignment absent; credential authority local. |
| Individual | Regular member account and independent Explore catalog; partner `participant` is a different local identity/view. | No common person ID, listing, registration or permission contract. |

## Approved target access matrix by original resource

`Own` means an authorized resource grant, not every record of that type. Institution Supervisor scope covers all operational groups/students of the assigned Initiative; Provider Supervisor scope remains assigned Experience/session/cohort. Coach scope covers assigned groups/students only. The complete invariant list is in [master §23](../../DeepSprout.md#23-permissions-privacy-lifecycle-and-integrity-invariants).

| Action/resource | Representative | Initiative Supervisor | Assigned Coach | Student/Individual | Provider / appointed Supervisor | Platform Admin |
|---|---|---|---|---|---|---|
| Institution Initiative publish/revise | Own; no per-item Admin approval | Read/operate assignment | Linked/assigned metadata | Published eligible detail | Linked aggregate only | Unpublish/suspend/govern, not routine author |
| Initiative Application | Approve, Reject, Remove, Suspend, Restore, Block | **Approve same record once**, flag only | Assigned roster after acceptance | Apply/Withdraw own | — | Platform ban separately |
| Staff and Groups | Invite/revoke Coach/Supervisor; create/transfer/allocate | Create/transfer/allocate already active Coaches; cannot revoke staff | Own assigned roster/tasks | Own group/task | Provider owns its separate appointments | Govern identities, not routine allocation |
| Sessions/attendance/excuses | Own session rules; final excuse decision, report/correction oversight | Active grant confirms attendance by QR/typed/manual/online; recommends excuse | Limited operational consequence | Own registration/pass/excuse/status | Provider owns seats; appointed Supervisor checks only assigned session | Govern only |
| Program/assignments/reviews | Structured Initiative summary and permitted reports | Operational progress and Coach reports | One shared task engine for own group; authored review/notes | Own tasks/submissions/history | — | Catalog governance only |
| Experience/Booking/Waiting List | Agreed linked aggregate only | — | Own personal booking if applicable | Own book/queue/offer/cancel | Provider operates inventory; appointed Supervisor assigned attendance | Govern resource, not booking owner |
| Group Garden/Personal Garden | Initiative collective summary only | Initiative collective summary | Assigned collective view | Own Personal; authorized Group; limited Student Group only | No Provider Group Garden | Rule governance, no manual grant |
| Private Lab/Shield/Recovery | — | — | — | Own full Individual data | — | Denied by default; exceptional audited policy only |
| Identified Form responses | Own authorized version/answer scope | Operational scope only | Minimal consequence only | Own answer | Own Provider form as allowed | Purpose-bound governance |

**Numerical policy:** ≤135 accepted students and ≤3 active Supervisors **per Institution Initiative**. Pending/queued students do not occupy confirmed seats; suspended students retain a seat under the interim configurable default. No Coach group count or Coach-to-student ratio is approved. Phase-1 surveys are identified, not anonymous.

## Resource-boundary invariants and current gaps

1. Institution `ownerId` and Provider `ownerId` determine operational ownership. A partnership carries an explicit aggregate-only share and never copies Provider booking identities or safety details into Institution tables (`commands/institution.js:2-30`, `shared.js:30-44`).
2. Mentor permissions derive from owned group and assignments; membership allows a Student to read own submission, not all submissions (`commands/mentorship.js:2-35`). Current local guards enforce several cases; tampering with storage remains possible.
3. Supervisor acceptance and `sessionIds` scope must gate Provider attendance/evaluation; an active Initiative grant gates Institution session attendance. Cohort membership must select confirmed bookings. Current commands implement local checks (`commands/outdoor.js:2-25`); appointment revocation must revoke future operations, not delete history.
4. Institution team `capability` and resource `scope` are largely **descriptive** in current code. Before a convincing staff demo, every action must check the grant that its UI claims. Provider Staff is presently **MISSING**, not a hidden role.
5. Partner Participant access is granted to all verified partner people (`store.js:21,32`), while regular Individual access is a different implementation. A partner's operational role does not justify access to a participant's personal recovery data.
6. Platform Admin data access should be purpose-bound and audited. Current workspace Admin previews omit private student/participant work; legacy Admin sample user preview has assessment/Shield status, and current member preview is read-only. Real privacy policy and secure enforcement remain backend work.

**Demo acceptance:** exercise each role in a clean local state; own resources/actions succeed, unrelated IDs and cross-organization resources fail at both page and command level, staff grants have the stated scope, and a full Individual sees only their own participation. **Final backend:** enforce these rules server-side on every API/query, with durable grants, audit and privacy controls. Exact subrole names/permission bundles remain owner decisions; do not mistake this proposed matrix for already approved policy.
