# DeepSprout today: product, pages and connected cycles

**Reviewed:** 3 November 2026 (Asia/Amman). **Scope:** the current working tree, including in-progress local changes. This is a source-based inventory of the browser demonstration and the separate database milestone. It is not a claim that every control and state was manually retested today. The [product specification](../DeepSprout.md) records target behavior and older decisions; the dated [implementation reports](implementation/) record the tests run at each milestone.

> **8 November update:** the Outdoor Provider workspace was retired in the demo on 6 November (old `#/provider/*` links show a retirement page; Institutions own outdoor activities), and the approved database is the [58-table design](architecture/database/README.md). Independent Coach Programs are still in the demo although v4.1 retires them; see the [persistence contract](architecture/database/persistence-contract.md#4-known-conflicts-with-the-approved-design).

> **4 November target change:** This guide is a dated inventory of the demo, including old independent Coach and Outdoor Provider routes. Those are not current target workspaces. See the [v4.1 master](../DeepSprout.md) and [P0 target/deprecation map](architecture/p0-target-v4.1.md) for Institution-owned outdoor activities, invitation-only Initiative Coach/Supervisor, and the ASP.NET Core Identity direction. No migration or implementation is claimed here.

## What DeepSprout is

DeepSprout is a digital wellbeing project for people who want to spend less time in unintentional short-form feeds and more time in meaningful activities. The personal experience combines a continuous Recovery Journey, usually organized into four-week cycles, with attention practices, a small offline routine, optional browser support, periodic Lab check-ins and source-labelled Insights. Bimo is the original companion used in welcoming and guidance. The Garden makes eligible participation visible; it is not a medical recovery score. Institutions, Coaches, invited Students, Outdoor Providers and Supervisors can also run real-world initiatives, programs and experiences in connected demonstration workspaces.

The **running website** is available through ASP.NET Core MVC Razor views in `src/DeepSprout.Web`, with existing CSS and JavaScript under `wwwroot`. Personal and partner records are kept in browser storage and seeded fixtures. It is a functional local demonstration, not a deployed clinical service, secure multi-user platform or payment system. The solution contains an EF Core SQL Server context, migrations and database validation tests. MVC page routing is implemented; server-backed product commands and authentication are not.

## Main concepts and boundaries

| Term | Meaning in the current project |
| --- | --- |
| Recovery Journey / Cycle / Week | The person's continuing history, one bounded planning interval, and its weekly actions and review. Completing days is not a clinical recovery percentage. |
| Lab assessment | A versioned measurement attempt, distinct from an activity or weekly review. Optional since Onboarding 2.0: the journey starts at Journey Level 1 without one. No new weekly pair is scheduled. |
| Meaningful Practice | Depth Practice, Listening & Recall, Practical Micro-Challenge, or Protected Work. Attempts retain their own evidence and outcome. |
| Offline Routine | A personally chosen small action away from the screen, recorded as self-report. |
| Initiative / Program / Experience | Institution-owned public Initiative, independent Coach-owned invite-only Program, and Provider-owned outdoor experience or camp. They have different owners and participation rules. |
| Application / Booking / Attendance / Completion | Separate facts. Applying does not reserve a session, booking does not prove attendance, and attendance alone does not prove completion. |
| Personal / Group Garden | The current Personal scene has four practice-type trees and bounded decorations; the Group Garden belongs to an Initiative or independent Coach group. These are separate views and source rules. |
| Workspace grant | A local role and resource scope. Switching a workspace changes the view; it does not grant a new role. Browser guards are demonstrative, not server authorization. |

## Public, access and presentation pages

| Page | Current purpose |
| --- | --- |
| [Home](../src/DeepSprout.Web/Views/Home/Index.cshtml) (`/` or `/index.html`) | Member-aware introduction with Bimo, four destination cards, this week's action, real-world ideas, available Provider opportunities, a visual journey, community preview and next actions. |
| [Story landing](../src/DeepSprout.Web/Views/Public/Landing.cshtml) | Earlier scroll-driven “Break the Loop” public narrative. It remains a separate page. |
| [Pricing](../src/DeepSprout.Web/Views/Public/Pricing.cshtml) | Free and Plus comparison and explanatory sections. Displayed prices and upgrade controls are a prototype; checkout is not connected. |
| [Register](../src/DeepSprout.Web/Views/Auth/Register.cshtml) / [Login](../src/DeepSprout.Web/Views/Auth/Login.cshtml) | Individual entry and local form demonstration. No real email, social sign-in, password account service or server session. |
| [Partner entry](../src/DeepSprout.Web/Views/Entry/Partners.cshtml) / [workspace access](../src/DeepSprout.Web/Views/Workspaces/Index.cshtml) | Choose and apply as Coach, Institution or Outdoor Provider; local verification/application status, invitations, login and workspace selection. |
| [Invitation entry](../src/DeepSprout.Web/Views/Workspaces/Join.cshtml) | Carries a group invitation token into the workspace flow. Delivery is a copied link, not email. |
| [Missing page](../src/DeepSprout.Web/Views/Shared/NotFound.cshtml) | Illustrated recovery page; ASP.NET Core returns HTTP 404 for missing routes. |
| [Demo presenter](../src/DeepSprout.Web/Views/Demo/Presenter.cshtml), [hero lab](../src/DeepSprout.Web/Views/Labs/Hero.cshtml), [hero v2 lab](../src/DeepSprout.Web/Views/Labs/HeroV2.cshtml), [reels lab](../src/DeepSprout.Web/Views/Labs/HeroReels.cshtml) | Presentation and visual experiments. These are not steps required to use the personal journey. |

The links above point to the Razor view sources. [The MVC route manifest](../src/DeepSprout.Web/page-routes.json) maps the historic `.html` URLs to those views. A direct route is an entry point, not evidence that the visitor has completed earlier steps.

## Individual pages, in journey order

| Page | What the person can see or do |
| --- | --- |
| [Onboarding](../src/DeepSprout.Web/Views/Member/Onboarding.cshtml) | Onboarding 2.0: Meet Bimo, exactly six questions with a top progress bar and save/resume, then “You’re ready to begin” and the story. No mandatory assessment. |
| [Lab](../src/DeepSprout.Web/Views/Member/Lab.cshtml) and [assessment player](../src/DeepSprout.Web/Views/Member/Assessment.cshtml) | Digital Habits, Sustained Attention, Inhibitory Control and Depth Challenge are optional; attempt history, official/practice distinction and validity remain. Historical weekly records are kept; no new weekly window is generated. |
| [Starting Point](../src/DeepSprout.Web/Views/Member/StartingPoint.cshtml) | Opens the Week 1 preview directly at Journey Level 1 (or explains optional Lab results when present), asks for an initial offline commitment, and activates the plan only after an explicit choice. Results are task evidence, not diagnosis. |
| [Roadmap / Recovery Plan](../src/DeepSprout.Web/Views/Member/RecoveryPlan.cshtml) | Overview, This week, Adjust and History tabs; current action, four-week direction, routine and support tools. Changes apply to future work and preserve recorded history. |
| [Weekly Review](../src/DeepSprout.Web/Views/Member/WeeklyReview.cshtml) | Shows what was recorded, asks about manageability and fit, previews a next week and saves a deliberate decision. It is a review, not a fifth practice. |
| [Activities](../src/DeepSprout.Web/Views/Member/Training.cshtml) | A suggested next action, four practice families, practice history, Coach-assigned work and an editable offline to-do. Players capture their own evidence; a timer alone does not approve work. |
| [Digital Shield](../src/DeepSprout.Web/Views/Member/Shield.cshtml) | Manual Website Protection and one shared selected-site Usage Reminder. A separately installed local [Chrome extension](../extensions/digital-shield/README.md) can enforce supported-domain navigation blocking and record eligible browser activity after explicit pairing; the website alone cannot. |
| [Garden](../src/DeepSprout.Web/Views/Member/Garden.cshtml) | Current four-tree Personal scene, type progress, recent qualifying sources and bounded flower/rabbit/birdhouse effects. No-data is neutral. A later design instruction proposes one clean ivory scene with **one main plant**; changing the current Garden is a separate design task, so this guide describes what runs now. |
| [Insights](../src/DeepSprout.Web/Views/Member/Insights.cshtml) | Overview, Digital Habits, Plan & Practice, Assessments, Offline Life and Next Steps. Browser usage has 7/14/28-day controls and coverage context. Missing or incompatible evidence must not be presented as zero or improvement. |
| [Explore](../src/DeepSprout.Web/Views/Member/Explore.cshtml) | Filters Initiatives, Sessions, Experiences and Competitions; shows details, local applications/bookings and the person's Initiative and registration states. Live partner publications are combined with labelled sample listings. |
| [Community](../src/DeepSprout.Web/Views/Member/Community.cshtml) | Local feed, search/filter, posting, reactions, comments, bookmarks and challenges. Demo interactions remain on the device. |
| [Profile](../src/DeepSprout.Web/Views/Member/Profile.cshtml) | Name, plan preview, setup answers, journey state, privacy explanation, reminder preferences, stored-data view and local reset. The Plus plan and email change are not live services. |

## Partner and administration pages

Partner pages use hash routes below [`/workspaces.html`](../src/DeepSprout.Web/Views/Workspaces/Index.cshtml). The [navigation source](../src/DeepSprout.Web/wwwroot/src/workspaces/navigation.js) is the current menu authority. Detail pages, builders and tabs appear inside those route families.

| Workspace | Current pages and main actions |
| --- | --- |
| [Coach](../src/DeepSprout.Web/Views/Workspaces/Index.cshtml) | Dashboard; My Groups and student rosters; Tasks and Reviews; Reports, Notifications and Profile. Independent Coaches also have Program builder/detail, invited membership, Group Garden and completion. Institution Coaches act only within assigned Initiative groups. |
| [Invited Student](../src/DeepSprout.Web/Views/Workspaces/Index.cshtml) | My overview, Sessions & initiative, Tasks & forms, Attendance, Group Garden, Updates, Account & upgrade. Program members can submit/revise work and see Coach feedback. An upgrade keeps the same person and prior participation. |
| [Institution](../src/DeepSprout.Web/Views/Workspaces/Index.cshtml) | Dashboard, Initiatives and six-stage builder, Applications, Team & Groups, Sessions & workshops, Attendance & excuses, Reports, Forms & surveys, Competitions, Settings. `Reports` now opens a received-Supervisor-report inbox with filters, issue notes, attached Coach reports and export/print options. Some older `group-garden`/`partners` routes currently show a temporary hidden-page message. |
| ~~Outdoor Provider~~ | Retired on 6 November 2026. `#/provider/*` shows a retirement page. Outdoor activities, bookings, waiting lists, cohorts and completion moved to the Institution workspace ([redesign log](implementation/partner-workspaces-v41-redesign.md)). |
| [Supervisor](../src/DeepSprout.Web/Views/Workspaces/Index.cshtml) | Dashboard plus context-specific Coaches & students, Reports, Schedule, Groups, Attendance, Excuses, Applications, Provider experiences, cohorts and evaluations. Institution and Provider assignments retain separate scopes; the menu changes with active assignment kind. |
| [Partner Participant](../src/DeepSprout.Web/Views/Workspaces/Index.cshtml) | Opportunity discovery, registrations, Initiatives and account, with nested experience/booking/session/form/competition pages. The regular Individual Explore is also connected to partner records; this workspace is an additional operational view. |
| [Platform Admin demo](../src/DeepSprout.Web/Views/Workspaces/Index.cshtml) | Dashboard, partner request review, institutions/people/resources, Community moderation, assessments and System Journey. Additional routable governance pages cover catalog, policies, CMS, entitlements, reports, audit and settings. The System Journey is a read-only walkthrough. |
| [Legacy Admin demo](../src/DeepSprout.Web/Views/Admin/Index.cshtml#/dashboard) | Separate local Admin with Dashboard, Users, Activities, Roadmaps, Assessments, Shield, Content, Community, Subscriptions & Revenue and Settings; Groups, Garden Rules and Audit remain routable. Some legacy content reaches Individual pages. It has not been merged into the partner Admin. |

The workspace registration/auth routes also cover application status, email verification simulation, staff invitations and appointment acceptance. Demo identity switching, resettable scenarios and a movable demo clock are local review tools. They are not real account proof or cross-device transactions.

### Partner route inventory

These are the current route families, including useful detail pages beyond the visible sidebar. All paths below are hashes on `/workspaces.html`.

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
| Provider (retired) | `#/provider/*` | Retirement notice only; the same functions live under the Institution workspace. |
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

The separate `/admin.html` legacy Admin uses `#/dashboard`, `#/users`, `#/activities`, `#/plans`, `#/assessments`, `#/shield`, `#/content`, `#/community`, `#/subscriptions` and `#/settings`. `#/groups`, `#/garden` and `#/audit` remain routable but are not in its simplified sidebar. Its `#/reports` path redirects to Subscriptions & Revenue.

## End-to-end cycles

1. **Personal recovery:** register locally → Meet Bimo → six questions → the story (watch or skip) → Home at Journey Level 1 with a Week 1 proposal → user-chosen plan activation (Lab assessments optional) → Home and Roadmap → practice/routine/optional Shield → weekly review → source-labelled Insights and earned Garden effects → another week or cycle. No official Lab reassessment is scheduled.
2. **Institution Initiative:** Representative builds/publishes an Initiative → it enters regular Explore → Individual applies → authorized Representative/Supervisor admission → group and Coach assignments → sessions, forms and participation → Supervisor facts and reports → Representative's received report inbox. One application, seat, session registration, attendance fact and completion record are distinct.
3. **Institution staff and Supervisor:** Representative invites staff into a specific Initiative; Supervisor acts only after the relevant grant is active. The Supervisor handles roster, session attendance, excuses and operational Insights; Coach reports can be included in a submitted Supervisor summary. The Representative makes the final excuse decision. A new report inbox provides a readable received document, attachments and downloads.
4. **Independent Coach Program:** Admin approves a Coach → Coach creates/publishes an invite-only Program and group → invitation is accepted by a matching person → Coach assigns tasks → Student submits → Coach approves, asks for revision or rejects → reporting and Group Garden reflect eligible evidence → Program completion preserves history. An optional Institution link does not transfer Program ownership.
5. **Student continuity:** an invited Student initially sees limited group work and Group Garden. Upgrading to Individual starts the six-question personal journey at Level 1 under the same person identity while retaining invitation, submissions and reviews. Lab assessments remain optional.
6. **Outdoor Activity (Institution-owned since 6 November; formerly Outdoor Provider):** a verified Institution publishes a versioned trip or camp → Individual books or joins the waiting list → cancelled seat can create a time-limited offer → accepted offer becomes a confirmed booking → assigned Supervisor records attendance → evaluation and published completion criteria determine completion → Institution reports and eligible Personal Garden detail use original records. QR/credential handling and delivery are simulated locally.
7. **Cross-owner partnerships (retired by v4.1):** former links between an Institution and a Provider experience or independent Program are history only; no new partnership is created.
8. **Platform governance:** partner Admin reviews applications and publication status, catalog/policy metadata, moderation, local audit and demonstration reports. Legacy Admin still separately manages some member-facing content, Community and commercial previews. Consolidation requires feature-by-feature parity.

## Current implementation and evidence limits

| Layer | Present | Boundary |
| --- | --- | --- |
| MVC web app | Razor pages with browser-local Individual and partner commands, seeded demonstrations and original Bimo assets | Records and authorization can be changed by someone controlling the browser; no real identity, email, payment, server session or synchronized multi-user capacity. |
| Browser extension | Optional MV3 Chrome extension for ten supported domain families on the documented local origins | No mobile app control, Reels-only detection, production distribution or authenticated server sync. Browser data is partial and local. |
| Server/database | MVC page host; the approved [58-table design](architecture/database/README.md) as SQL script, EF Core model (`DeepSproutV5DbContext`) and two migrations verified on disposable databases. The older 129-table M1 code remains only for the historical `DeepSprout_Validation` database. | No page reads or writes SQL Server; production authorization and server persistence are not implemented. See the [persistence contract](architecture/database/persistence-contract.md). |
| Product/design | [Target specification](../DeepSprout.md), [design guidance](../DESIGN.md) and dated implementation evidence | The target's older four-tree Garden decision conflicts with the newer one-main-plant design instruction. Preserve the current UI until that separate Garden task resolves the scene and evidence mapping. |

For current behavior, inspect the linked source; the dated [implementation records](implementation/) cover Onboarding 2.0 and the v4.1 partner redesign. Automated browser suites provide milestone evidence, but this document does not promote every historical pass into a fresh verification of today's uncommitted working tree.

**Verification:** test results for the 8 November reconciliation are in the [EF Core adoption](architecture/database/efcore-v5-adoption.md#verification-8-november-2026-disposable-databases-on-desktop-a4al2kr) record; run the suites listed in the [README](../README.md#testing-accessibility-and-privacy) for the current tree.

## Where to continue

- [README](../README.md): short project overview, local run and deployment.
- [Database index](architecture/database/README.md): the approved 58-table design, persistence contract and EF Core adoption.
- [Product specification](../DeepSprout.md): intended rules and open decisions, with its dated §29 implementation snapshot.
- [Documentation map](README.md): which document is authoritative for each question.
