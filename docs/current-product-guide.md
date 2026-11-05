# DeepSprout today: product, pages and connected cycles

**Reviewed:** 3 November 2026 (Asia/Amman). **Scope:** the current working tree, including in-progress local changes. This is a source-based inventory of the browser demonstration and the separate database milestone. It is not a claim that every control and state was manually retested today. The [product specification](../DeepSprout.md) records target behavior and older decisions; the dated [implementation reports](implementation/) record the tests run at each milestone.

## What DeepSprout is

DeepSprout is a digital wellbeing project for people who want to spend less time in unintentional short-form feeds and more time in meaningful activities. The personal experience combines a continuous Recovery Journey, usually organized into four-week cycles, with attention practices, a small offline routine, optional browser support, periodic Lab check-ins and source-labelled Insights. Bimo is the original companion used in welcoming and guidance. The Garden makes eligible participation visible; it is not a medical recovery score. Institutions, Coaches, invited Students, Outdoor Providers and Supervisors can also run real-world initiatives, programs and experiences in connected demonstration workspaces.

The **running website** is available through ASP.NET Core MVC Razor views, with the existing CSS and JavaScript. Personal and partner records are kept in browser storage and seeded fixtures. It is a functional local demonstration, not a deployed clinical service, secure multi-user platform or payment system. The `Server/` solution contains the MVC host plus .NET domain/application projects, an EF Core SQL Server context, migrations and database validation tests. MVC page routing is implemented; server-backed product commands and authentication are not. The target document also describes a possible Angular client, which is not in this checkout.

## Main concepts and boundaries

| Term | Meaning in the current project |
| --- | --- |
| Recovery Journey / Cycle / Week | The person's continuing history, one bounded planning interval, and its weekly actions and review. Completing days is not a clinical recovery percentage. |
| Lab assessment | A versioned measurement attempt, distinct from an activity or weekly review. Four valid baselines start the personal journey; the demo later offers a weekly pair. |
| Meaningful Practice | Depth Practice, Listening & Recall, Practical Micro-Challenge, or Protected Work. Attempts retain their own evidence and outcome. |
| Offline Routine | A personally chosen small action away from the screen, recorded as self-report. |
| Initiative / Program / Experience | Institution-owned public Initiative, independent Coach-owned invite-only Program, and Provider-owned outdoor experience or camp. They have different owners and participation rules. |
| Application / Booking / Attendance / Completion | Separate facts. Applying does not reserve a session, booking does not prove attendance, and attendance alone does not prove completion. |
| Personal / Group Garden | The current Personal scene has four practice-type trees and bounded decorations; the Group Garden belongs to an Initiative or independent Coach group. These are separate views and source rules. |
| Workspace grant | A local role and resource scope. Switching a workspace changes the view; it does not grant a new role. Browser guards are demonstrative, not server authorization. |

## Public, access and presentation pages

| Page | Current purpose |
| --- | --- |
| [Home](../Client/index.html) (also the generated [root entry](../index.html)) | Member-aware introduction with Bimo, four destination cards, this week's action, real-world ideas, available Provider opportunities, a visual journey, community preview and next actions. The root file is built from the Client source. |
| [Story landing](../Client/landing.html) | Earlier scroll-driven “Break the Loop” public narrative. It remains a separate page. |
| [Pricing](../Client/pricing.html) | Free and Plus comparison and explanatory sections. Displayed prices and upgrade controls are a prototype; checkout is not connected. |
| [Register](../Client/register.html) / [Login](../Client/login.html) | Individual entry and local form demonstration. No real email, social sign-in, password account service or server session. |
| [Partner entry](../Client/partners.html) / [workspace access](../Client/workspaces.html#/auth/register) | Choose and apply as Coach, Institution or Outdoor Provider; local verification/application status, invitations, login and workspace selection. |
| [Invitation entry](../Client/join.html) | Carries a group invitation token into the workspace flow. Delivery is a copied link, not email. |
| [Missing page](../Client/404.html) | Illustrated recovery page; `Client/serve.py` returns it with HTTP 404 for missing paths. |
| [Demo presenter](../Client/demo.html), [hero lab](../Client/hero-lab.html), [hero v2 lab](../Client/hero-lab-v2.html), [reels lab](../Client/hero-reels-lab.html) | Presentation and visual experiments. These are not steps required to use the personal journey. |

The root `Client/*.html` shortcuts generally redirect to their `Client/src/pages/...` implementation. A direct link to a page is an entry point, not evidence that the visitor has completed earlier steps.

## Individual pages, in journey order

| Page | What the person can see or do |
| --- | --- |
| [Onboarding](../Client/src/pages/member/onboarding/onboarding.html) | Bimo introduction, personal setup, privacy explanation and handoff to the four baselines. |
| [Lab](../Client/src/pages/member/lab/lab.html) and [assessment player](../Client/src/pages/member/lab/assessment.html) | Digital Habits, Sustained Attention, Inhibitory Control and Depth Challenge; attempt history, official/practice distinction and validity. After all four valid baselines, the local interim schedule offers Digital Habits plus a rotating task every seven days, independent of cycle end. |
| [Starting Point](../Client/src/pages/member/onboarding/starting-point.html) | Explains baseline results, builds a plan preview, asks for an initial offline commitment, activates the plan and offers a short product guide. Results are task evidence, not diagnosis. |
| [Roadmap / Recovery Plan](../Client/src/pages/member/recovery-plan/recovery-plan.html) | Overview, This week, Adjust and History tabs; current action, four-week direction, routine and support tools. Changes apply to future work and preserve recorded history. |
| [Weekly Review](../Client/src/pages/member/weekly-review/weekly-review.html) | Shows what was recorded, asks about manageability and fit, previews a next week and saves a deliberate decision. It is a review, not a fifth practice. |
| [Activities](../Client/src/pages/member/training/training.html) | A suggested next action, four practice families, practice history, Coach-assigned work and an editable offline to-do. Players capture their own evidence; a timer alone does not approve work. |
| [Digital Shield](../Client/src/pages/member/shield/shield.html) | Manual Website Protection and one shared selected-site Usage Reminder. A separately installed local [Chrome extension](../extensions/digital-shield/README.md) can enforce supported-domain navigation blocking and record eligible browser activity after explicit pairing; the website alone cannot. |
| [Garden](../Client/src/pages/member/garden/garden.html) | Current four-tree Personal scene, type progress, recent qualifying sources and bounded flower/rabbit/birdhouse effects. No-data is neutral. A later design instruction proposes one clean ivory scene with **one main plant**; changing the current Garden is a separate design task, so this guide describes what runs now. |
| [Insights](../Client/src/pages/member/insights/insights.html) | Overview, Digital Habits, Plan & Practice, Assessments, Offline Life and Next Steps. Browser usage has 7/14/28-day controls and coverage context. Missing or incompatible evidence must not be presented as zero or improvement. |
| [Explore](../Client/src/pages/member/explore/explore.html) | Filters Initiatives, Sessions, Experiences and Competitions; shows details, local applications/bookings and the person's Initiative and registration states. Live partner publications are combined with labelled sample listings. |
| [Community](../Client/src/pages/member/community/community.html) | Local feed, search/filter, posting, reactions, comments, bookmarks and challenges. Demo interactions remain on the device. |
| [Profile](../Client/src/pages/member/profile/profile.html) | Name, plan preview, setup answers, journey state, privacy explanation, reminder preferences, stored-data view and local reset. The Plus plan and email change are not live services. |

## Partner and administration pages

Partner pages use hash routes below [`Client/workspaces.html`](../Client/workspaces.html). The [navigation source](../src/DeepSprout.Web/wwwroot/src/workspaces/navigation.js) is the current menu authority. Detail pages, builders and tabs appear inside those route families.

| Workspace | Current pages and main actions |
| --- | --- |
| [Coach](../Client/workspaces.html#/mentor/dashboard) | Dashboard; My Groups and student rosters; Tasks and Reviews; Reports, Notifications and Profile. Independent Coaches also have Program builder/detail, invited membership, Group Garden and completion. Institution Coaches act only within assigned Initiative groups. |
| [Invited Student](../Client/workspaces.html#/student/dashboard) | My overview, Sessions & initiative, Tasks & forms, Attendance, Group Garden, Updates, Account & upgrade. Program members can submit/revise work and see Coach feedback. An upgrade keeps the same person and prior participation. |
| [Institution](../Client/workspaces.html#/organization/dashboard) | Dashboard, Initiatives and six-stage builder, Applications, Team & Groups, Sessions & workshops, Attendance & excuses, Reports, Forms & surveys, Competitions, Settings. `Reports` now opens a received-Supervisor-report inbox with filters, issue notes, attached Coach reports and export/print options. Some older `group-garden`/`partners` routes currently show a temporary hidden-page message. |
| [Outdoor Provider](../Client/workspaces.html#/provider/overview) | Overview, Experiences and builder, Calendar, Registrations, Waiting List, Supervisors & staff, Partnerships, Attendance, Evaluations, Reports and profile. Provider owns the booking and completion rules. |
| [Supervisor](../Client/workspaces.html#/supervisor/dashboard) | Dashboard plus context-specific Coaches & students, Reports, Schedule, Groups, Attendance, Excuses, Applications, Provider experiences, cohorts and evaluations. Institution and Provider assignments retain separate scopes; the menu changes with active assignment kind. |
| [Partner Participant](../Client/workspaces.html#/participant/discover) | Opportunity discovery, registrations, Initiatives and account, with nested experience/booking/session/form/competition pages. The regular Individual Explore is also connected to partner records; this workspace is an additional operational view. |
| [Platform Admin demo](../Client/workspaces.html#/admin/overview) | Dashboard, partner request review, institutions/people/resources, Community moderation, assessments and System Journey. Additional routable governance pages cover catalog, policies, CMS, entitlements, reports, audit and settings. The System Journey is a read-only walkthrough. |
| [Legacy Admin demo](../Client/admin.html#/dashboard) | Separate local Admin with Dashboard, Users, Activities, Roadmaps, Assessments, Shield, Content, Community, Subscriptions & Revenue and Settings; Groups, Garden Rules and Audit remain routable. Some legacy content reaches Individual pages. It has not been merged into the partner Admin. |

The workspace registration/auth routes also cover application status, email verification simulation, staff invitations and appointment acceptance. Demo identity switching, resettable scenarios and a movable demo clock are local review tools. They are not real account proof or cross-device transactions.

### Partner route inventory

These are the current route families, including useful detail pages beyond the visible sidebar. All paths below are hashes on `Client/workspaces.html`.

| Workspace | Route | Page responsibility |
| --- | --- | --- |
| Access | `#/auth/register`, `#/auth/login`, `#/auth/verify`, `#/auth/application-status`, `#/auth/workspaces` | Local account/application entry, simulated verification and available workspace selection. |
| Access | `#/auth/application`, `#/auth/institution-invitation`, `#/auth/staff-invitation`, `#/auth/appointment`, `#/join/...` | Partner application and scoped invitation/appointment acceptance. |
| Coach | `#/mentor/dashboard` | Next work and scope summary for independent or Institution Coach context. |
| Coach | `#/mentor/programs`, `/new`, `/:id`, `/:id/edit` | Independent Program list, builder, versioned detail and draft editing. |
| Coach | `#/mentor/groups`, `/:id` | Owned or assigned groups, membership and invitations. |
| Coach | `#/mentor/students`, `/:id` | Scoped roster and individual task history. |
| Coach | `#/mentor/assignments` | Create, reschedule or cancel work without overwriting earlier submissions. |
| Coach | `#/mentor/reviews`, `/:id` | Decide submitted attempts, request revision and preserve feedback/history. |
| Coach | `#/mentor/group-garden` | Independent Program group contribution view. |
| Coach | `#/mentor/reports`, `#/mentor/notifications`, `#/mentor/profile` | Source-based reports/CSV, local notices and account settings. |
| Student | `#/student/dashboard`, `#/student/group` | Overview, Initiative/Program context and sessions. |
| Student | `#/student/tasks`, `/:id`, `#/student/protected-work/:id` | Assigned tasks/forms, submission and a local Protected Work timer. |
| Student | `#/student/progress`, `#/student/garden` | Attendance/task history and the permitted Group Garden. |
| Student | `#/student/notifications`, `#/student/account` | Updates, identity and same-person Individual upgrade. |
| Institution | `#/organization/dashboard` | Initiative status, staffing and next operational actions. |
| Institution | `#/organization/initiatives`, `/new`, `/:id`, `/:id/edit` | Initiative list, six-stage draft builder, publication and detail/lifecycle. |
| Institution | `#/organization/participants` | Applications, admission, waitlist and member status. |
| Institution | `#/organization/team` | Staff invitations, Coach/Supervisor assignments and groups. |
| Institution | `#/organization/sessions` | Workshops/sessions, registration and operational details. |
| Institution | `#/organization/attendance` | Attendance context and Representative excuse decisions. |
| Institution | `#/organization/reports`, `/:id` | Received Supervisor summaries, issue filters, attached Coach originals, full document and exports. |
| Institution | `#/organization/forms`, `/new`, `/:id`, `/:id/edit`, `/:id/responses` | Identified versioned forms, publication and scoped responses. |
| Institution | `#/organization/competitions`, `/:id` | Creative entry rules, judging and published outcomes. |
| Institution | `#/organization/settings` | Institution profile/settings. Older `partners` and `group-garden` paths currently return a hidden-page message. |
| Provider | `#/provider/overview` | Owned experiences, upcoming field work and actions. |
| Provider | `#/provider/experiences`, `/new`, `/:id`, `/:id/edit` | Versioned experience/camp builder and lifecycle. |
| Provider | `#/provider/calendar` | Scheduled sessions. |
| Provider | `#/provider/registrations` | Booking list, approval and cancellation, separate from attendance. |
| Provider | `#/provider/waitlist` | Queued people, offers, expiry and seat release. |
| Provider | `#/provider/supervisors` | Email-based, resource-scoped appointments and revocation. |
| Provider | `#/provider/partnerships` | Institution link requests and permitted aggregate sharing. |
| Provider | `#/provider/attendance`, `#/provider/evaluations` | Factual presence, corrections, published completion criteria and reviews. |
| Provider | `#/provider/reports`, `#/provider/profile` | Source-labelled operational totals and provider information. |
| Supervisor | `#/supervisor/dashboard` | Select an Institution Initiative or Provider appointment as the current context. |
| Supervisor | `#/supervisor/coaches`, `#/supervisor/applications`, `#/supervisor/students` | Initiative team, admission and group duties within an active grant. |
| Supervisor | `#/supervisor/schedule`, `#/supervisor/attendance`, `#/supervisor/excuses` | Session roster, attendance/correction and excuse recommendation. |
| Supervisor | `#/supervisor/reports` | Initiative operational Insights, Coach report review and submitted summary; Provider closing report in Provider context. |
| Supervisor | `#/supervisor/experiences`, `#/supervisor/cohorts`, `#/supervisor/evaluations` | Only assigned Provider resources, cohort membership and completion evaluation. |
| Participant | `#/participant/discover`, `#/participant/registrations`, `#/participant/initiatives`, `#/participant/account` | Opportunity discovery, own status/history and identity. |
| Participant | `#/participant/experiences`, `#/participant/bookings`, `#/participant/sessions`, `#/participant/forms`, `#/participant/competitions` | Nested booking, session, response and entry paths under the original resource. |
| Partner Admin | `#/admin/overview`, `#/admin/organizations`, `#/admin/institutions`, `#/admin/users` | Overview, partner approval and access directories. |
| Partner Admin | `#/admin/initiatives`, `#/admin/programs`, `#/admin/experiences` | Resource publication/oversight without access to private personal results. |
| Partner Admin | `#/admin/moderation`, `#/admin/assessments`, `#/admin/system-journey` | Demo moderation, assessment metadata and read-only system walkthrough. |
| Partner Admin | `#/admin/activity-catalog`, `#/admin/policies`, `#/admin/cms`, `#/admin/entitlements`, `#/admin/reports`, `#/admin/audit`, `#/admin/system` | Additional routable catalog, policy, content, commercial, reporting and governance screens. |

The separate `Client/admin.html` legacy Admin uses `#/dashboard`, `#/users`, `#/activities`, `#/plans`, `#/assessments`, `#/shield`, `#/content`, `#/community`, `#/subscriptions` and `#/settings`. `#/groups`, `#/garden` and `#/audit` remain routable but are not in its simplified sidebar. Its `#/reports` path redirects to Subscriptions & Revenue.

## End-to-end cycles

1. **Personal recovery:** register locally → Bimo/setup → four valid Lab baselines → Starting Point/plan activation → Home and Roadmap → practice/routine/optional Shield → weekly review → source-labelled Insights and earned Garden effects → another week or cycle. The official weekly Lab pair has its own eligibility window.
2. **Institution Initiative:** Representative builds/publishes an Initiative → it enters regular Explore → Individual applies → authorized Representative/Supervisor admission → group and Coach assignments → sessions, forms and participation → Supervisor facts and reports → Representative's received report inbox. One application, seat, session registration, attendance fact and completion record are distinct.
3. **Institution staff and Supervisor:** Representative invites staff into a specific Initiative; Supervisor acts only after the relevant grant is active. The Supervisor handles roster, session attendance, excuses and operational Insights; Coach reports can be included in a submitted Supervisor summary. The Representative makes the final excuse decision. A new report inbox provides a readable received document, attachments and downloads.
4. **Independent Coach Program:** Admin approves a Coach → Coach creates/publishes an invite-only Program and group → invitation is accepted by a matching person → Coach assigns tasks → Student submits → Coach approves, asks for revision or rejects → reporting and Group Garden reflect eligible evidence → Program completion preserves history. An optional Institution link does not transfer Program ownership.
5. **Student continuity:** an invited Student initially sees limited group work and Group Garden. Upgrading to Individual starts the four-baseline personal journey under the same person identity while retaining invitation, submissions and reviews.
6. **Outdoor Provider:** approved Provider publishes a versioned experience or camp → Individual books or joins the waiting list → cancelled seat can create a time-limited offer → accepted offer becomes a confirmed booking → assigned Supervisor records attendance → evaluation and published completion criteria determine completion → Provider reports and eligible Personal Garden detail use original records. QR/credential handling and delivery are simulated locally.
7. **Cross-owner partnerships:** Institution may link a Provider-owned experience or an independent Coach Program under a scoped agreement. The original owner still operates it; shared reports use permitted aggregate information rather than transferring private personal records.
8. **Platform governance:** partner Admin reviews applications and publication status, catalog/policy metadata, moderation, local audit and demonstration reports. Legacy Admin still separately manages some member-facing content, Community and commercial previews. Consolidation requires feature-by-feature parity.

## Current implementation and evidence limits

| Layer | Present | Boundary |
| --- | --- | --- |
| Client | Static multipage Individual UI, hash-routed partner workspaces, local data/commands, seeded demonstrations and original Bimo assets | Records and authorization can be changed by someone controlling the browser; no real identity, email, payment, server session or synchronized multi-user capacity. |
| Browser extension | Optional MV3 Chrome extension for ten supported domain families on the documented local origins | No mobile app control, Reels-only detection, production distribution or authenticated server sync. Browser data is partial and local. |
| Server/database | MVC page host and Domain/Application/Infrastructure projects, EF Core SQL Server context, migrations, SQL guards and integration test suite. [1 November validation report](architecture/database/phase-b/02-final-validation-ar.md) records 129 target tables, 23 migrations and 330 passing checks in the authorized validation database. | MVC page rendering is runnable, but production authorization and live client persistence are not implemented. A [3 November review](architecture/database/review/README.md) is read-only and records recommendations. |
| Product/design | [Target specification](../DeepSprout.md), [design guidance](../DESIGN.md) and dated implementation evidence | The target's older four-tree Garden decision conflicts with the newer one-main-plant design instruction. Preserve the current UI until that separate Garden task resolves the scene and evidence mapping. |

Historical [cycle audits](cycles/README.md) describe the 15 October code state and contain gaps that later work closed. For current behavior, inspect the linked source and later [implementation reports](implementation/). Automated browser suites provide milestone evidence, but this document does not promote every historical pass into a fresh verification of today's uncommitted working tree.

**Verification during this documentation pass:** `node tests/client/page-wiring.test.cjs` passed for 14 pages. The combined Institution, Supervisor, Coach and Provider domain suites passed 37 of 41 cases. Four Institution/Supervisor cases stopped when the currently edited session-booking command required an explicit “remote or on-site” value that those tests did not supply. This is a current test/fixture mismatch in the working tree; the remaining downstream steps in those four cases were not established by this run. No application code or test fixture was changed as part of this documentation update.

## Where to continue

- [README](../README.md): short project overview, local run and deployment.
- [Client guide](../docs/client-static-site-README.md): client layout, test commands and local preview.
- [Server guide](../Server/README.md): database solution and validation scope.
- [Product specification](../DeepSprout.md): intended rules and open decisions, with its dated §29 implementation snapshot.
- [Implementation reports](implementation/) and [database architecture](architecture/database/README.md): milestone evidence and data design.
