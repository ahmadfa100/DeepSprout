# DeepSprout today: product, pages and connected cycles

**Scope:** current MVC checkout and working-tree changes. For approved requirements use the [P0 decision map](architecture/p0-target-v4.1.md), [58-table database](architecture/database/README.md) and [master specification](../DeepSprout.md). The [persistence contract](architecture/database/persistence-contract.md) identifies the authoritative source for each workflow. Dated records describe their original milestones.

## What DeepSprout is

DeepSprout is a digital wellbeing project for people who want to spend less time in unintentional short-form feeds and more time in meaningful activities. The personal experience combines a continuous Recovery Journey with attention practices, a small offline routine, optional browser support, optional Lab assessments and source-labelled Insights. Azm is the original companion used in welcoming and guidance. New Individual cycles span 28 calendar days across four seven-day weeks. The Garden makes eligible participation visible; it is not a medical recovery score. The Institution, Coach, invited Student and Supervisor workspaces demonstrate Initiative and outdoor operations in the browser. The independent Provider workspace is retired. Independent Coach Programs remain in a legacy demo path.

The MVC app serves Razor views and JavaScript. For signed-in Individuals, Identity, Quick Setup, Recovery, the four practice players, Offline Routine, Insights and Personal Garden use V5 SQL Server for their migrated records. Community posts and Platform Admin moderation use the same database. Lab, Shield observations, and partner participation still have separate browser-local sources.

## Main concepts and boundaries

| Term | Meaning in the current project |
| --- | --- |
| Recovery Journey / Cycle / Week | The person's continuing history, one bounded planning interval, and its weekly actions and review. Completing days is not a clinical recovery percentage. |
| Lab assessment | A versioned measurement attempt, distinct from an activity or weekly review. Optional since Onboarding 2.0: the journey starts at Journey Level 1 without one. No new weekly pair is scheduled. |
| Meaningful Practice | Depth Practice, Listening & Recall, Visual Observation & Analysis, and Reasoning & Digital Judgment. Activity Difficulty 1–3 is tracked per practice, separately from Journey Level 1 — New Beginning. |
| Offline Routine | A personally chosen small action away from the screen, recorded as self-report. |
| Initiative / Program / Experience | Initiatives and Outdoor Activities/camps are owned by Institutions. Independent Coach Programs survive in a legacy demo path and are history-only in the approved target. |
| Application / Booking / Attendance / Completion | Separate facts. Applying does not reserve a session, booking does not prove attendance, and attendance alone does not prove completion. |
| Personal / Group Garden | The Personal Garden has four practice-type trees and bounded decorations. The live Group Garden belongs to the Institution Initiative and reads eligible SQL contributions across its groups. Independent Program Gardens remain in the labeled legacy demo. |
| Workspace grant | A local role and resource scope. Switching a workspace changes the view; it does not grant a new role. Browser guards are demonstrative, not server authorization. |

## Public, access and presentation pages

| Page | Current purpose |
| --- | --- |
| [Home](../src/DeepSprout.Web/Views/Home/Index.cshtml) (`/` or `/index.html`) | Member-aware introduction with Azm, four destination cards, this week's action, real-world ideas, opportunity and Community previews, a visual journey and next actions. Signed-in Recovery and Garden summaries read saved server data; the previews are separate from the SQL Community feed and future SQL Explore integration. |
| [Story landing](../src/DeepSprout.Web/Views/Public/Landing.cshtml) | Earlier scroll-driven “Break the Loop” public narrative. It remains a separate page. |
| [Pricing](../src/DeepSprout.Web/Views/Public/Pricing.cshtml) | Free and Plus comparison and explanatory sections. Displayed prices and upgrade controls are a prototype; checkout is not connected. |
| [Register](../src/DeepSprout.Web/Views/Auth/Register.cshtml) / [Login](../src/DeepSprout.Web/Views/Auth/Login.cshtml) | Individual registration and login use ASP.NET Core Identity and an authenticated server session. External email delivery and social sign-in are pending. |
| [Partner entry](../src/DeepSprout.Web/Views/Entry/Partners.cshtml) / [workspace access](../src/DeepSprout.Web/Views/Workspaces/Index.cshtml) | Institution applications and status use the signed-in Identity and V5 SQL. Platform Admin can request more information or reject. New approval requires an approved verified-email and evidence process. Scoped Coach/Supervisor invitations remain browser demos. |
| [Invitation entry](../src/DeepSprout.Web/Views/Workspaces/Join.cshtml) | Carries a demo invitation token into the workspace flow. Links are copied; real email delivery and server validation of partner grants are pending. |
| [Missing page](../src/DeepSprout.Web/Views/Shared/NotFound.cshtml) | Illustrated recovery page; ASP.NET Core returns HTTP 404 for missing routes. |
| [Demo presenter](../src/DeepSprout.Web/Views/Demo/Presenter.cshtml), [hero lab](../src/DeepSprout.Web/Views/Labs/Hero.cshtml), [hero v2 lab](../src/DeepSprout.Web/Views/Labs/HeroV2.cshtml), [reels lab](../src/DeepSprout.Web/Views/Labs/HeroReels.cshtml) | Presentation and visual experiments. These are not steps required to use the personal journey. |

The links above point to the Razor view sources. [The MVC route manifest](../src/DeepSprout.Web/page-routes.json) maps the historic `.html` URLs to those views. A direct route is an entry point, not evidence that the visitor has completed earlier steps.

## Individual pages, in journey order

| Page | What the person can see or do |
| --- | --- |
| [Onboarding](../src/DeepSprout.Web/Views/Member/Onboarding.cshtml) | Onboarding 2.0: Meet Azm, exactly six questions with a top progress bar and save/resume, then “You’re ready to begin” and the story. No mandatory assessment. |
| [Lab](../src/DeepSprout.Web/Views/Member/Lab.cshtml) and [assessment player](../src/DeepSprout.Web/Views/Member/Assessment.cshtml) | Optional Digital Habits, Sustained Attention, Inhibitory Control and Depth Challenge. The browser journal retains local attempt history and the official/practice distinction. No server Lab writer or new periodic official window is wired. |
| [Starting Point](../src/DeepSprout.Web/Views/Member/StartingPoint.cshtml) | Opens the Week 1 preview directly at Journey Level 1 (or explains optional Lab results when present), asks for an initial offline commitment, and activates the plan only after an explicit choice. Results are task evidence, not diagnosis. |
| [Roadmap / Recovery Plan](../src/DeepSprout.Web/Views/Member/RecoveryPlan.cshtml) | Overview, This week, Adjust and History tabs; current action, four-week direction, routine and support tools. Activation schedules Week 1. Confirming a Weekly Review schedules subsequent eligible days. Final review and Next Cycle/Maintenance previews use SQL. General direct adjustments to active schedules are outside the current SQL route set; Weekly Review and routine edits have their own saved actions. |
| [Weekly Review](../src/DeepSprout.Web/Views/Member/WeeklyReview.cshtml) | Four SQL-backed review windows show linked scored attempts, distinct self-reported routine dates and available observation evidence. Weeks 1–3 can schedule only the next eligible week. A late review can continue conservatively without backfill; Week 4 saves the review without scheduling Week 5. |
| [Activities](../src/DeepSprout.Web/Views/Member/Training.cshtml) | A suggested next action, four practice families, practice history, Coach-assigned work and an editable offline to-do. All four approved practice families use pinned SQL versions and server scoring for plan and eligible optional attempts. Routine edits and check-ins save as self-report. Assigned uses the same SQL tasks, written attempts and feedback as the Student workspace. |
| [Digital Shield](../src/DeepSprout.Web/Views/Member/Shield.cshtml) | Manual Website Protection and one shared selected-site Usage Reminder. A separately installed local [Chrome extension](../extensions/digital-shield/README.md) can enforce supported-domain navigation blocking and record eligible browser activity after explicit pairing; the website alone cannot. |
| [Garden](../src/DeepSprout.Web/Views/Member/Garden.cshtml) | The four-tree scene and Home preview read the same SQL projection. Qualifying scores and scoped reviewed tasks can grow trees; self-reported routine days can earn flowers; persisted authorized attendance and verified Institution camp completion can earn bounded decorations. Browser-only partner rows do not qualify. Inactivity is neutral. Numeric production thresholds and caps remain open. A later design instruction proposes one clean ivory scene with **one main plant**; changing the current Garden is a separate design task, so this guide describes what runs now. |
| [Insights](../src/DeepSprout.Web/Views/Member/Insights.cshtml) | SQL-backed Recovery Cycle summaries, eligible scheduled vs completed practices, scores, independent difficulty, routine dates, reviews and comparable past cycles. Lab and browser record views have separate sources. Missing or incompatible evidence must not be presented as zero or improvement. |
| [Explore](../src/DeepSprout.Web/Views/Member/Explore.cshtml) | Searches by title, topic or organizer and filters by kind and format. Live Initiative details show the verified organizer, dates, seats and application window. Signed-in Individuals apply, see their decisions in My Initiatives and withdraw before the deadline. The fixed application form uses self-reported age and eligibility. Outdoor Activity previews and unrelated sample listings carry demo labels. |
| [Community](../src/DeepSprout.Web/Views/Member/Community.cshtml) | Signed-in SQL feed with search, filters, pagination, My posts, owner edits/withdrawal, comments, likes, bookmarks, reports and Admin moderation. The two-person challenge board stays browser-local. |
| [Profile](../src/DeepSprout.Web/Views/Member/Profile.cshtml) | Account security links to the SQL-backed /account/profile and POST sign-out. The broader Profile & settings page still contains browser preferences and demo plan/commercial controls. No live profile editing or email change is wired. |

## Partner and administration pages

Partner pages use hash routes below [`/workspaces.html`](../src/DeepSprout.Web/Views/Workspaces/Index.cshtml). The [navigation source](../src/DeepSprout.Web/wwwroot/src/workspaces/navigation.js) is the current menu authority. Detail pages, builders and tabs appear inside those route families.

| Workspace | Current pages and main actions |
| --- | --- |
| [Coach](../src/DeepSprout.Web/Views/Workspaces/Index.cshtml) | The live workspace shows assigned Initiatives, groups and rosters. Coaches publish and manage their assignments, review permitted submissions and prepare group reports from recorded work. Independent Programs remain in the browser demo. |
| [Invited Student](../src/DeepSprout.Web/Views/Workspaces/Index.cshtml) | Live My Group and My Tasks show the person's current placement and previous work. Students can start tasks, submit written attempts and view their feedback. Eligible Students with a confirmed email can enable Individual access on the same account. |
| [Institution](../src/DeepSprout.Web/Views/Workspaces/Index.cshtml) | The live workspace provides the dashboard, Initiative builder, Applications, Team & Groups, Sessions & Workshops, Reports and profile. Representatives receive Supervisor summaries and their included Coach originals. Attendance, forms and competitions remain in the demo. |
| ~~Outdoor Provider~~ | Retired on 6 November 2026. `#/provider/*` shows a retirement page. Outdoor activities, bookings, waiting lists, cohorts and completion moved to the Institution workspace ([redesign log](implementation/partner-workspaces-v41-redesign.md)). |
| [Supervisor](../src/DeepSprout.Web/Views/Workspaces/Index.cshtml) | Live Groups and Insights use the exact assigned Initiative. Supervisors can see assignment and review records, review submitted Coach reports and send summaries to the Institution. Admissions, attendance, excuses and Outdoor Activity staffing remain in the demo. |
| [Partner Participant](../src/DeepSprout.Web/Views/Workspaces/Index.cshtml) | Opportunity discovery, registrations, Initiatives and account, with nested experience/booking/session/form/competition pages. Regular Individual Explore reads the same-origin partner projection. This operational view is additional and does not replace the regular member route. |
| [Platform Admin](../src/DeepSprout.Web/Views/Workspaces/Index.cshtml) | The live `/admin.html` entry and workspace require current SQL Admin authority. Community queues, decisions and audit are live. The [account access API](backend/authentication/README.md#account-access-commands) supports audited suspension, restoration and session revocation. Partner review, governance, directory and reports remain demo capabilities. |
| [Legacy Admin demo](../src/DeepSprout.Web/Views/Admin/Index.cshtml#/dashboard) | Separate local Admin with Dashboard, Users, Activities, Roadmaps, Assessments, Shield, Content, Community, Subscriptions & Revenue and Settings; Groups, Garden Rules and Audit remain routable. Some published local content still reaches member pages. The older controls remain in the explicit legacy demo; authenticated Community links use the Platform Admin moderation console. |

Live Initiative staff links open the Identity sign-in flow. The matching account must already have a confirmed email before it can accept or decline. Representatives copy and share the link. Automatic delivery and new email confirmation await production approval. Demo identity switching, email verification simulation and the movable demo clock remain local review tools.

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
| Coach | `#/mentor/group-garden` | Shared Group Garden for the active Initiative appointment. |
| Coach | `#/mentor/reports`, `#/mentor/notifications`, `#/mentor/profile` | Source-based reports/CSV, local notices and account settings. |
| Student | `#/student/dashboard`, `#/student/group` | Overview, Initiative/Program context and sessions. |
| Student | `#/student/tasks`, `/:id`, `#/student/protected-work/:id` | Assigned tasks/forms, submission and a local timer on a legacy assignment route. |
| Student | `#/student/progress`, `#/student/garden` | Attendance/task history and the permitted Group Garden. |
| Student | `#/student/sessions`, `/:id` | Live Initiative Session schedule, registration, cancellation and own registration history. |
| Student | `#/student/notifications`, `#/student/account` | Updates, identity and same-person Individual upgrade. |
| Institution | `#/organization/dashboard` | Initiative status, staffing and next operational actions. |
| Institution | `#/organization/initiatives`, `/new`, `/:id`, `/:id/edit` | Initiative list, six-stage draft builder, publication and detail/lifecycle. |
| Institution | `#/organization/participants` | Applications, admission, waitlist and member status. |
| Institution | `#/organization/team` | Staff invitations, Coach/Supervisor assignments and groups. |
| Institution | `#/organization/sessions` | Live Initiative Session drafts, publication, changes, cancellation and registration roster. |
| Institution | `#/organization/attendance` | Attendance context and Representative excuse decisions. |
| Institution | `#/organization/reports`, `/:id` | Received Supervisor summaries, issue filters, attached Coach originals, full document and exports. |
| Institution | `#/organization/forms`, `/new`, `/:id`, `/:id/edit`, `/:id/responses` | Identified versioned forms, publication and scoped responses. |
| Institution | `#/organization/competitions`, `/:id` | Creative entry rules, judging and published outcomes. |
| Institution | `#/organization/group-garden` | Shared Group Garden linked from the owning Institution's Initiative overview. |
| Institution | `#/organization/settings` | Institution profile and settings. |
| Provider (retired) | `#/provider/*` | Retirement notice only; the same functions live under the Institution workspace. |
| Supervisor | `#/supervisor/dashboard` | Select an Initiative or Institution Outdoor Activity appointment as the current context. |
| Supervisor | `#/supervisor/coaches`, `#/supervisor/applications`, `#/supervisor/students` | Initiative team, admission and group duties within an active grant. |
| Supervisor | `#/supervisor/schedule`, `#/supervisor/attendance`, `#/supervisor/excuses` | Live Initiative Session schedule and registration roster. The attendance and excuse routes remain in the demo. |
| Supervisor | `#/supervisor/reports` | Initiative operational Insights, Coach report review and submitted summary; an Outdoor Activity closing report in its appointed context. |
| Supervisor | `#/supervisor/group-garden` | Shared Group Garden for the active Initiative appointment. |
| Supervisor | `#/supervisor/experiences`, `#/supervisor/cohorts`, `#/supervisor/evaluations` | Only assigned Institution Outdoor Activities, cohort membership and completion evaluation. |
| Participant | `#/participant/discover`, `#/participant/registrations`, `#/participant/initiatives`, `#/participant/account` | Opportunity discovery, own status/history and identity. |
| Participant | `#/participant/experiences`, `#/participant/bookings`, `#/participant/sessions`, `#/participant/forms`, `#/participant/competitions` | Nested booking, session, response and entry paths under the original resource. |
| Partner Admin | `#/admin/overview`, `#/admin/organizations`, `#/admin/institutions`, `#/admin/users` | Overview, partner approval and access directories. |
| Partner Admin | `#/admin/initiatives`, `#/admin/programs`, `#/admin/experiences` | Resource publication/oversight without access to private personal results. |
| Partner Admin | `#/admin/moderation`, `#/admin/assessments`, `#/admin/system-journey` | SQL Community moderation with Platform Admin identity; demo Quick Setup reference and system walkthrough. |
| Partner Admin | `#/admin/activity-catalog`, `#/admin/policies`, `#/admin/cms`, `#/admin/entitlements`, `#/admin/reports`, `#/admin/audit`, `#/admin/system` | Governance/report paths and separate demo screens; catalog, policies, CMS and entitlements are hidden from the primary console. |

The separate `/admin.html?legacy=1` demo uses `#/dashboard`, `#/users`, `#/activities`, `#/plans`, `#/assessments`, `#/shield`, `#/content`, `#/community`, `#/subscriptions` and `#/settings`. `#/groups`, `#/garden` and `#/audit` remain routable but are not in its simplified sidebar. Its `#/reports` path redirects to Subscriptions & Revenue.

## End-to-end cycles and evidence

**APPROVED TARGET** is the owner decision or published constraint. **IMPLEMENTED & VERIFIED** applies to the server and UI paths explicitly exercised. **IMPLEMENTED / NOT VERIFIED** is code with no adequate runtime coverage here. **PARTIAL** marks a working slice with a gap. **FRONTEND DEMO ONLY** identifies browser-local or simulated commands even when their tests pass. **NOT IMPLEMENTED** marks an approved path without a working entry point. **LEGACY / SUPERSEDED** retains historical records or demo routes without granting new target authority. **POLICY UNDECIDED** marks a choice left to the owner.

| Cycle | Current implementation | Target boundary and verification |
| --- | --- | --- |
| A. Individual | **IMPLEMENTED & VERIFIED** for the SQL setup, Recovery, four scored practice types, routine, core Insights and Personal Garden flows. New cycles span 28 calendar days. Week 4 review and final cycle reflection are distinct. Next Cycle or one-practice-day Maintenance starts as a preview and still requires explicit activation. | **PARTIAL** for account lifecycle, direct post-activation adjustments, whole-page settings and evidence integration. Lab stays optional and browser-local. Shield uses a local extension bridge. Current Garden defaults are retained and production thresholds/caps remain **POLICY UNDECIDED**. |
| B. Community | **IMPLEMENTED & VERIFIED** for Member posting, ownership, replies, per-user interactions and paginated reads, plus Admin moderation, reasons and persisted audit. | The two-seat quiz has local rooms and local results, **FRONTEND DEMO ONLY**. Cross-device schema and transport are **POLICY UNDECIDED**. |
| C. Institution & Initiative | SQL-backed Institution claims, resubmission and Admin decisions. The live Institution profile, six-stage Initiative builder and Applications queue require confirmed Identity email and active membership in a verified Institution. Regular Explore and the queue share SQL application status and decision history. | **PARTIAL**. New Representative grants await verification policy. Revision or cancellation affecting active participants, bookings, staffing and operational reports await their scheduled slices. |
| D. Coach, Supervisor & Student | Scoped staff invitations, group allocation, same-person upgrade, assigned written work, Coach reviews and Initiative reports use V5 SQL. The shared Group Garden shows eligible scored assignment contributions and their history. Student Schedule and Individual Explore share Initiative Session registrations. Independent Coach Programs remain in the legacy demo. | New assignment-linked practice intake and collective milestone thresholds remain pending. Attendance and excuse workflows remain browser demos. |
| E. Institution Outdoor Activities | **FRONTEND DEMO ONLY** for Institution-owned builder, bookings, capacity and waitlist offers, attendance and completion. `AttendanceQrService` is **IMPLEMENTED / NOT VERIFIED** as a standalone server foundation with no MVC route. | SQL Garden recognizes legitimate persisted attendance and Institution camp evidence. Tests use V5 fixture records and do not prove a production event workflow supplies those rows. Native camera, provider report APIs, live notifications and multi-user booking persistence remain unverified or absent. |
| F. Platform Admin | The current database Platform Admin can use SQL Community moderation, account access commands and the Institution requests queue. | **PARTIAL**. Institution approval and secure document review await policy. Other governance, CMS, catalog and reporting controls retain their demo or hidden status. |
| G. Shared systems | Identity/session and migrated actor checks, anti-forgery, SQL V5 and local demo state are separate. Shared local command/selector tests cover lifecycle and scope inside one origin. | **PARTIAL** for durable notifications, partner audit, end-to-end cross-device scope, secure documents and production lifecycle. Payments remain simulated by design. Historical M1 is separate, and browser fixtures are not imported. Responsive and keyboard checks are targeted; no complete accessibility audit. |

The [backend implementation plan](implementation/backend-start-plan.md) orders the remaining stages. The [database adoption record](architecture/database/efcore-v5-adoption.md) preserves the dated schema verification.

### Verification on 23 November 2026

- The solution built successfully. The [V5 integration suite](../tests/onboarding-integration.test.mjs) passed 37 checks on a new disposable SQL Server database, including MVC smoke. It exercised protected Identity sessions, saving and resuming setup, explicit activation, four review windows, day 28/29, continuation, all four players, offline check-ins, Insights/Garden reload and Member/Admin Community moderation. The tests cover unauthorized access, duplicates, source attribution and supported refresh or new-login paths.
- The [client model suite](../tests/client/) passed 172 checks. It exercises Initiative publication/admission, staff scope, attendance/absence and excuse rules, Coach/Student tasks and reviews, reports/Group Garden, Outdoor Activity booking and waitlists, and local Shield rules on browser data models.
- A separate Playwright run against a disposable V5 MVC host inspected partner intake and the Admin application form. A demo approval survived reload. The browser also checked Institution builder, team, applications, reports, activities and bookings, denial for a non-Admin demo identity, Coach groups/reviews, Student tasks/Garden, Supervisor attendance, and retired Provider entry. In a real signed-in test session, regular Explore loaded the local partner graph, an optional Digital Habits response appeared in same-browser Lab history, and Shield disabled enforcement without the extension. Selected pages ran at 390 px without page exceptions.
- The browser review above predates Phase 3B. Staff invitations and revocation, task submissions, attendance and booking corrections, native behavior with a paired extension, the other Lab instruments and broad keyboard and assistive-technology coverage remain outside that review. The server QR foundation was inspected in source.

## Where to continue

- [README](../README.md): short project overview, local run and deployment.
- [Database index](architecture/database/README.md): the approved 58-table design, persistence contract and EF Core adoption.
- [Product specification](../DeepSprout.md): intended rules and open decisions, with its dated §29 implementation snapshot.
- [Documentation map](README.md): which document is authoritative for each question.
