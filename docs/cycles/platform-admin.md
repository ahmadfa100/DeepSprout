# One Platform Admin: two current implementations

> **Dated audit, not the target contract (15 October 2026).** Routes, fields, tests and code observations below describe the inspected working tree. The [authoritative v4.0 master](../../DeepSprout.md) and its [decision register](../../DeepSprout.md#26-decision-register-authoritative-interim-and-open) govern all implementation targets, including decisions approved after this audit.

**Owner decision:** `Client/admin.html#/…` (legacy) and `Client/workspaces.html#/admin/…` (workspace Admin) are parts of **one intended system-owner workspace**, not separate owner roles. This is analysis only; neither is removed or consolidated. The partner workspace Admin is the approved **migration destination**; this does not license discarding legacy functionality before verified parity. The old `docs/product-specification.md` now points to the canonical master. Sources: legacy `Client/src/admin/app.js:1-83`, `store.js:1-83`, `core.js:1-70`, `operations.js:1-93`, `platform.js:1-71`, `community.js:1-21`, `subscriptions.js:1-13`; workspace `Client/src/workspaces/pages/admin.js:1-43`, `commands/platform.js:2-42`, `data/platform.js:1-12`, `navigation.js:9`.

## All current Admin pages

Legacy shell groups **Overview**, **Management**, **Publishing**, **Business**, **System** (`src/admin/app.js:11-25`). Hidden but routable: `groups`, `garden`, `audit`; `reports` redirects to `subscriptions`. Workspace shell has a flat Admin sidebar. Each row lists actual sections/actions; all legacy pages use `deepsprout-admin-demo-v1`, workspace pages use `deepsprout-ecosystem-demo-v1` unless stated.

| Legacy `admin.html#/` page | Visible sections/actions and current reach |
|---|---|
| `dashboard` Dashboard | Platform overview/metrics, attention queue, participation/account status, completion distribution and local audit. Member preview uses `DeepSproutAccount` read-only; sample counts remain a different population. Period selector and notification popover are local. |
| `users` Users | Current member preview, sample user table/filter/detail/status modal. Sample account status changes only legacy store; current member preview is read-only. |
| `groups` Groups (hidden nav) | Sample groups table, create/edit name/code/trainer, member checkboxes, archive. Distinct from Mentor groups. |
| `activities` Activities | Catalog table/search/filter; create/edit/preview with name, description, category, goals, minutes, mode, evidence, eligibility, status and optional guide image/alt. Published entries appear as read-only guides on regular Individual Activities (`training.js:261`). They do not become active plan tasks. |
| `plans` Roadmaps | Plan templates, deterministic simulator, edit/template controls. Simulator is a preview; member Recovery Plan is separate. |
| `assessments` Assessments | Library metadata/question editing and publication states. Not wired to executable Individual Lab instrument definitions or official eligibility windows. |
| `shield` Digital Shield | Protection/reminder preset configuration and edit controls. No extension or real browser blocking. |
| `garden` Garden Rules (hidden nav) | Rule list/edit/status and previews in legacy store; does not govern current Individual account Garden policy. |
| `content` Content Studio | Four allowlisted landing regions (hero intro, features intro, focus title/image), edit mode, preview, draft save, publish/rollback. Published values reach `landing.html` via `published-content.js:4-38`; they do not edit arbitrary pages. |
| `community` Community | Member reports/posts from `deepsprout-community-demo-v1`; Hide/Dismiss/Remove style moderation changes member feed (`src/admin/community.js:2-21`, member `community.js:15-22,166`). |
| `subscriptions` Subscriptions & Revenue | Plan tiers, local subscription/payment tables and empty states; illustrative Free/Plus Monthly/Plus Annual prices share `src/js/config/subscriptions.js` with Pricing. No checkout or actual revenue processing. `reports` alias lands here, so no separate legacy Reports page. |
| `settings` Settings | Admin name/preferences, linked hidden pages/partner Admin, reset legacy data. Reset does not reset partner or member keys. |
| `audit` Audit Log (hidden nav) | Local event table/detail from legacy mutations; browser-editable, not tamper-proof. |

| Workspace `workspaces.html#/admin/` page | Visible sections/actions and current reach |
|---|---|
| `overview` Overview | Ecosystem identities, pending applications, published initiative/experience metrics; queue, action links and recent local activity. Partner-only data. |
| `users` Users & access | Partner identity/workspace/status table, detail, Suspend/Reactivate with reason. Excludes member private data; suspension affects partner workspace access only. |
| `mentor-applications`, `mentor-applications/:id` | Mentor queue/filter and detailed application, selected file names, messages, Approve/Reject/Needs More Info/Suspend. Approval grants Mentor partner access and empty owned scope. |
| `organizations`, `organizations/:id` | Institution application queue/detail and same decisions. Approval creates Institution membership/entity. |
| `providers`, `providers/:id` | Provider application queue/detail and same decisions. Approval creates Provider membership/entity. |
| `programs` Groups & programs | Governance-level list/status/preview for Mentor programs; no private submissions. |
| `initiatives` Initiatives & sessions | Institution initiative status/preview/suspend; underlying Session records are not a separate full Admin table here. |
| `experiences` Experiences & camps | Provider resource oversight/status/preview; no direct Provider operational ownership. |
| `activity-catalog` Activity catalog | Versioned local metadata/description/difficulty/duration/status editor. This catalog feeds Mentor Program Builder, **not regular Individual Activities**. |
| `assessments` Assessment content | Four metadata definitions/version/status; no scored Individual Lab task publishing. |
| `policies` Recovery & Garden policies | Versioned notes/status; no current Individual Recovery/Garden rule propagation. |
| `cms` Visual Content Studio | One allowlisted partner-discovery region: heading, copy, typography token, color token, scale, local image, alt. Visual pencil, draft save, preview, publish/rollback; published heading appears in Partner Participant discovery, not regular Individual/public landing. |
| `moderation` Reported content | Fictional partner moderation records/status/reviewer notes. Does not read/write regular member Community moderation key. |
| `reports` Platform reports | Partner-domain counts/chart/date/CSV from ecosystem records. No unified member account analytics. |
| `audit` Audit & governance | Partner actions with actor/reason/resource/result, inspect/CSV. Local and mutable. |
| `system` System & notices | Illustrative offer-window minutes, notice template and local notice-preview toggle; no email/SMS. |
| `entitlements` Plans & entitlements | Proposed audience tiers, TBD price/quota, notes; edit quota/notes. Does not change regular Pricing/subscription access. |
| `account` shared account | Partner Admin identity and local workspace access; separate from legacy demo session. |

## Feature-by-feature comparison and preservation contract

| Capability | Legacy | Workspace Admin | Shared? / stronger current implementation / preserve in one future workspace |
|---|---|---|---|
| Login and global identity | Any-host demo Admin flag `deepsprout-admin-demo-session`; sample directory and current member preview. | Provisioned Leen `admin` workspace, local role switch. | **No shared Admin identity.** Preserve single owner workspace and permissioned global directory; secure auth later. Demo shortcut is acceptable in this phase. |
| Mentor/Institution/Provider approvals | No operational partner approval. | Application detail, info request, decision, empty resource scope. | **Workspace stronger.** Preserve approval history, reason, entity/member creation; regular Individual listings still separate. |
| Users/workspace access | Sample users/status; member preview read-only. | Partner people/status/workspaces. | **Separate populations and IDs.** Preserve privacy-safe member preview and partner grants; unify identity contract, not sample counts. |
| Groups/programs | Legacy training groups with trainer assignment/members. | Mentor programs oversight, partner group data elsewhere. | **No shared groups.** Preserve relevant group-management need after model reconciliation; avoid treating legacy group as Mentor group. |
| Activity publishing | Rich guide editor; published guide reaches regular Activities. | Activity metadata feeds Mentor builder. | **Different catalogs, no shared records.** Preserve Individual guide delivery and governed Mentor activity references; define one versioned catalog and projections. |
| Assessment content | Library/question UI separate from executable tasks. | Four metadata records only. | **Neither publishes validated Lab instruments.** Preserve controlled editor/versioning; score/eligibility authority still missing. |
| Recovery policy | Templates/simulator; no member plan delivery. | Metadata notes/status. | **Neither controls active member plan.** Preserve simulator as clearly illustrative; define real policy contract later. |
| Garden rules | Legacy list/previews, not member Garden policy. | Policy metadata and partner rewards. | **Neither governs fixed multi-tree Personal Garden.** Preserve source qualification and owner decision; no punitive inactivity. |
| CMS/visual edit | Four landing regions reach public landing. | One partner-discovery region reaches partner Participant. | **No shared CMS.** Both are functional in their own target; preserve allowlists, version/rollback, explicit target and preview. |
| Moderation | Reads/writes regular Community reports/posts. | Fictional partner moderation array. | **Legacy stronger for member effect.** Preserve real local member feed connection, reason and appeal states. |
| Partner resource oversight | None. | Program/initiative/experience governance and suspension. | **Workspace stronger.** Admin governs publication/access, not partner booking ownership. |
| Reports and audit | Dashboard analytics and legacy audit; `reports` is subscriptions alias. | Partner reports, source counts and partner audit. | **Neither unified.** Preserve source-qualified views and audit history, avoid fictional platform totals. |
| System/notices | Legacy settings/reset. | Offer minutes/template/preview. | **Separate scopes.** Preserve both settings with explicit effect and version. |
| Subscriptions/entitlements | Illustrative Individual price and local financial empty states; Pricing shared config. | All audience proposed tiers/quota notes, no payments. | **No shared entitlement enforcement.** Preserve both commercial configuration concepts, mark price/quota unapproved. |

## Field/action inventory and permissions

Workspace Admin modals: decision status + reason; person status + reason; resource status + governance reason; catalog description/notes plus activity difficulty/duration and Draft/Published/Archived status; moderation action + notes; entitlement quota + notes; CMS heading*, intro copy*, font Serif/Sans, color Forest/Sage/Navy, size Large/Medium, allowlisted image, alt*; system offer minutes* (1–120), notice template*, local preview toggle. `pages/admin.js:12-43` dispatches to `commands/platform.js:2-42`. Legacy forms use `core.js`, `operations.js`, `platform.js` and `ui.js`; required HTML fields and local validation are present but server authority absent. Legacy `subscriptions` is read-only local records and an external Pricing link, not a plan editor (`subscriptions.js:1-13`).

| Legacy editor/modal | Actual inputs, defaults and validation; destination |
|---|---|
| User detail | Account status active/paused/archived (current status); updates sample `users`, not current member account (`core.js:19-25`). |
| Group create/edit/detail | Group name* blank/current max 80; Identifier* blank/current max 20, unique case-insensitive; Trainer select from sample Trainer users; detail has Search students and member checkboxes. Writes legacy `groups`, not Mentor groups (`core.js:31-47`). |
| Activity create/edit | Name* max 80; description* max 240; instructions* max 600; category from legacy categories (includes superseded Stillness & Reflection); estimated minutes* default 10, 1–180; availability Assigned/On Demand/Triggered/Scheduled Review; evidence In-platform recorded/Self-reported offline/None; supported-goal checkboxes; completion requirement* max 100; optional existing asset path max 200 and alt max 140; Roadmap eligible on; controlled Garden reward off. Publication status control/action follows the editor/row; writes legacy `activities` and affects regular Activities guide (`core.js:48-70`). Allowed path/eligibility policy needs review. |
| Plan Simulator/template | Simulator: goal, assessment profile (Starting gently/Frequent distraction/Ready for deeper practice), preference (Short daily steps/Offline first/Structured focus), available minutes* default 15, 5–120 and published eligible activity checks. Template: name* max 80, goal, maximum daily activities* default 1 (1–3), review day, rule version* default `1.0` pattern `N.N`, active/inactive. Writes `planTemplates`; preview does not rewrite member plan (`operations.js:12-35`). |
| Assessment content | Instructions* max 400; prompts one per line*; active/inactive; current version and history displayed. Saves library version, not executable Lab instrument (`operations.js:37-49`). |
| Shield preset/category | Preset name* max 60, suggested start time* default 19:00, intentional pause message* max 240; category name* max 50 with duplicate check. Writes legacy `shield`, not browser extension (`operations.js:51-60,89`). |
| Garden rule | Preview status active/inactive; editor rule name* max 80, triggering event* max 100, evidence type, growth effect (personal To-Do restricted to No growth), eligibility condition* max 140, repeat limit, explanation* max 240. Writes legacy `garden` only (`operations.js:63-78`). Current rule options predate the fixed multi-tree owner decision. |
| Content Studio | One of four approved keys; text region: Text* max 400, typography body/heading/eyebrow, size inherit/small/large, weight inherit/medium/bold, color default/pine/muted, alignment left/center. Image region: one of three local assets, Alt text* max 140, fit cover/contain, position center/top/bottom/left/right. Draft/preview/mobile/publish/restore controls write `content`; only published data reaches landing selectors (`platform.js:4-26,54-71`). |
| Community report | Approve content, Hide content, Dismiss report; no freeform reason field in current dialog. Member-source choice writes shared Community moderation key; sample-source choice changes legacy records (`platform.js:36-43,55-65`). |
| Settings | Admin display name* max 60; site name* max 60; internal announcement max 160; Reset legacy demo data. Writes legacy `settings` only (`platform.js:45-52,67-69`). |

All defaults above are new-record or current-record values from renderer calls; `*` denotes HTML-required markup. The conditional legacy dialogs were code-inspected rather than clicked in this audit. Subscription prices are illustrative, not approved business values.

All mutation controls are **WC local** within their respective store, unless their recipient is the other store: legacy published Activities/landing CMS/Community are **WC to regular Individual**; workspace approval/resource/CMS are **WC within partner ecosystem**; assessment/recovery/Garden policy delivery to regular Individual is **BR/MI**. Status/filter/CSV are **WL**. Real audit/authorization, payment and delivery are **FUTURE BACKEND**. A local Admin route or demo identity must not be mistaken for production owner authorization.

## Required unified Admin contract

One Platform Admin should approve a partner once, govern platform catalog/policy/CMS/moderation, inspect source-qualified cross-cycle reports and manage identity/entitlements with least privilege. Its approvals should unlock the correct scoped workspace; approved partner publication should appear in regular Individual Explore; suspension/cancellation should remove eligibility while retaining history and notify affected people. Activity/content changes need explicit publication targets and versions. Admin may suspend a partner resource for governance, but must not silently take over that Provider's capacity/attendance or Institution's participant operations. For Demo E/F, local shared records and visible projection are mandatory. Production later adds secure owner authentication, audit integrity, scalable reports and subscription enforcement.

## Approved target correction

There is one conceptual Platform Admin. It verifies a new Institution **and Representative authority**, but approved Representatives publish Initiatives without per-item Admin approval. Institution-invited Coaches/Supervisors need no separate Admin review. Preserve legacy member Activity/CMS/Community, plans, Shield, Garden, groups and subscription capabilities and partner approval/oversight/reports/audit until each has a verified destination. The Admin demo shortcut is an honest static simulation, not production authentication. See [master §19](../../DeepSprout.md#19-one-platform-admin-governance-publishing-and-migration).
