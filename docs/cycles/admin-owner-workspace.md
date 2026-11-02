# Platform Admin: owner workflow

Implemented for `Client/workspaces.html#/admin/overview`.

## Destinations and purpose

- **Dashboard**: pending partner requests, pending posts and open reports, plus core platform totals.
- **Institutions & applications**: institution requests, Coach/Provider request tabs, all requests, and the institution directory. Application details show the submitted purpose, organization information, representative, file-name records and decision history. Approval, rejection and information requests require a reason in this interface.
- **People & roles**: unique registered identities, Coach/Supervisor/Student totals and filtered directories. Roles can overlap; they are not added together to fabricate a user total.
- **Initiatives / Coach programs / Outdoor experiences**: ownership and status oversight. Approved institutions publish initiatives directly; there is no per-initiative Admin approval queue. Suspended publication can be restored. Historical terminal resources are not offered a suspension action.
- **Community posts**: approval queue and all member-feed posts, including hidden/removed history.
- **Community reports** (`#/admin/moderation`): actual member-submitted reports with a post snapshot, reporting reason, outcome and decision history. Replaces the unrelated demonstration-only moderation row in this workspace's UI.
- **Assessments**: real definitions for the four Lab instruments. Questionnaire statements, reading passage/questions/options/correct answers, and task instructions are editable as durable versioned **content drafts**. Timing/scoring protocols and existing results are not changed by saving. Draft content is not published to the active Lab runtime. The UI says this explicitly.
- **Platform statistics** (`#/admin/reports`): people, institution participation, initiative status, community activity and recorded Initiative/Coach program completions. It is distinct from the community-report inbox.
- **Decision history**: existing workspace audit entries plus community moderation history, with a combined CSV export.
- **Settings**: existing operational configuration remains available.

Activity catalog, Recovery/Garden policy editing, Visual Content Studio, entitlement editing, and System Journey are temporarily hidden. Their data and implementations remain intact; direct workspace links explain that they are hidden. The separate legacy Admin implementation is preserved for its other capabilities.

## Persistence and sources

Applications, institutions, roles and assessment drafts use the existing `deepsprout-ecosystem-demo-v1` store and command authorization/persistence pipeline. `admin.assessment.content.save` validates content, archives the previous draft in `contentHistory`, increments the version, and records an audit entry.

Community moderation uses the member feed's existing `deepsprout-community-demo-v1` store. Original demonstration posts are read from the existing Community HTML, not copied into another data store. Member-created posts enter `moderation[postId] = 'pending'`; approval uses `visible`, and hidden/removed/rejected posts are excluded from the member feed. Reports and moderation history are saved together with the decision. Member writes preserve moderation history. Other open tabs refresh moderation through storage events.

Decisions and assessment saves report success only after localStorage succeeds. Failed writes show errors and preserve the stored record. Assessment draft edits have a navigation discard prompt and unload protection.

## Count definitions and limits

- Active initiatives are Published and within their start/end dates, using the workspace clock and Asia/Amman date.
- Completion counts use recorded `Completed` Initiative/Coach-program outcomes and unique person IDs. They do not infer completion from elapsed days or attendance.
- There is no platform-wide personal Recovery Cycle completion aggregate in the current private member model. It is not substituted with an unrelated count.
- Counts cover records available in this browser. This is not a secure, server-backed, multi-user Admin service.
- Application attachment records contain file names only; the interface does not pretend to expose uploaded document contents.
- Assessment publication still requires a compatible versioned scoring/runtime integration. Saved content drafts do not silently redefine the active tests.

## Verification

`node Client/tests/admin-owner-browser.test.cjs` exercises isolated browser storage, real UI submissions and refreshes: institution decisions and provisioning, new post approval, member report submission and removal, storage failures, assessment question editing/addition and version history, invalid input, unsaved-edit handling, history export, authorization, hidden routes, and mobile overflow. Screenshots are generated under `/private/tmp/admin-owner-*.png`.

`node Client/tests/partner-store.test.mjs` runs the existing 10 store regressions, including direct institution publication, partner approval/provisioning, role scope and historical operational behavior.
