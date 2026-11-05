<div align="center">
  <img src="src/DeepSprout.Web/wwwroot/assets/brand/logo.png" alt="DeepSprout leaf logo" width="76">
  <h1>DeepSprout</h1>
  <p><strong>Less scrolling. More living.</strong></p>
  <p>A digital wellbeing platform for reclaiming attention from compulsive short-form feeds and making room for meaningful life beyond the screen.</p>
  <p>
    <img src="https://img.shields.io/badge/status-browser--local%20demo-567d64" alt="Status: browser-local demo">
    <img src="https://img.shields.io/badge/current-HTML%20%7C%20CSS%20%7C%20JavaScript-173c33" alt="Current stack: HTML, CSS, JavaScript">
    <a href="https://github.com/ahmadfa100/DeepSprout"><img src="https://img.shields.io/badge/repository-DeepSprout-305b48" alt="DeepSprout repository"></a>
  </p>
</div>

![Editorial DeepSprout illustration: a short-form feed gives way to a growing sprout](docs/assets/readme/deepsprout-hero.svg)

DeepSprout joins a **personal Recovery Journey** with practice, browser support, real-world opportunities, and guided group work. Start with the [current product guide](docs/current-product-guide.md) for every page and connected cycle; the [product specification](DeepSprout.md) records intended rules and older decisions. The website can now be served by ASP.NET Core MVC from `Server/`. Its existing interactions still use browser-local demo records; server authentication and durable product persistence remain future work.

**Explore the demo:** [Home](http://127.0.0.1:8765/) · [Individual activities](http://127.0.0.1:8765/src/pages/member/training/training.html) · [Partner workspaces](http://127.0.0.1:8765/workspaces.html#/auth/login) · [System Journey walkthrough](http://127.0.0.1:8765/workspaces.html#/admin/system-journey)

## Contents

- [Why DeepSprout](#why-deepsprout)
- [Current page and cycle guide](#current-page-and-cycle-guide)
- [Product preview](#product-preview)
- [What the platform does](#what-the-platform-does)
- [The Recovery Journey](#the-recovery-journey)
- [Meet Bimo](#meet-bimo)
- [Garden and evidence](#garden-and-evidence)
- [Connected workspaces](#connected-workspaces)
- [Operational workflows](#operational-workflows)
- [Pages and navigation](#pages-and-navigation)
- [Architecture and technology](#architecture-and-technology)
- [Repository structure](#repository-structure)
- [Run locally](#run-locally)
- [Status and roadmap](#status-and-roadmap)
- [Testing, accessibility and privacy](#testing-accessibility-and-privacy)
- [Contributing and license](#contributing-and-license)

## Why DeepSprout

Short-form feeds can consume time a person meant to spend on rest, relationships, learning, or simply being offline. DeepSprout helps people, especially young people, notice that pattern and make intentional changes. Reading or focused work can support that goal, but becoming maximally productive is not a requirement. DeepSprout is neither a clinical treatment nor a general habit tracker.

The personal journey is supported by four distinct systems: **Recovery Plan** schedules and adapts actions; **Activities** holds practice and an optional offline routine; **Digital Shield** offers browser-scoped protection and usage reminders; **Lab and Insights** retain measurement and its source. **Explore** brings institution initiatives, workshops, and provider experiences into the same participation journey. Community and the original companion Bimo make the experience more welcoming. See [master §§1–2](DeepSprout.md#1-vision-positioning-users-and-product-boundaries) for product boundaries.

## Current page and cycle guide

The [3 November 2026 guide](docs/current-product-guide.md) inventories the public and access pages, every Individual destination, partner and Admin workspaces, and the personal, Institution, Coach, Student, Provider, Supervisor and governance cycles. It distinguishes what the browser demo does now from the database milestone and intended MVC server.

## Product preview

![Actual desktop render of the current DeepSprout home page, with Bimo beside the introductory message](docs/assets/readme/home-preview.png)

The image above is a **local browser capture** of the homepage at 1440 × 900 with a seeded demo account, taken for an earlier documentation pass. The current page may have changed since that capture. The [root entry](http://127.0.0.1:8765/) and [Client source](http://127.0.0.1:8765/index.html) use the same page markup.

## What the platform does

| Area | Purpose | Current checkout |
| --- | --- | --- |
| Onboarding with Bimo | Welcome, personal setup, four baseline Lab assessments, Starting Point, plan preview and activation | Browser-local flow; timed task and handoff validation documented in the [Round 2A report](docs/implementation/deepsprout-round2a-individual-onboarding-lab-report.md) |
| Recovery Plan | One continuous journey with usually 28-day cycles, an actionable week, review, future-only adjustment, and continuation decisions | Browser-local versioned journal; [Round 2C report](docs/implementation/deepsprout-round2c-adaptive-recovery-report.md) |
| Meaningful Practices | Depth Practice, Listening & Recall, Practical Micro-Challenge, and Protected Work; independent levels and evidence | Four local players and versioned content; [Round 2B report](docs/implementation/deepsprout-round2b-meaningful-practices-report.md) |
| Offline Routine | Small personally chosen real-world commitments | Local self-report, separate from system-scored practice |
| Digital Shield | Manual Website Protection and one shared selected-site Usage Reminder | Optional **local Chrome extension**; supported-domain, browser-only coverage and pairing limits in its [guide](extensions/digital-shield/README.md). No Pages pairing or production sync is claimed |
| Personal Garden | Earned visual growth from eligible practice and selected participation records | Four practice-type trees and bounded details in the current demo; a later one-main-plant design direction is a separate Garden task |
| Lab and Insights | Four baselines, periodic rechecks, source-labelled progress and missing-data context | Weekly demo Lab window and local source-labelled views; no clinical measurement claim |
| Explore and Community | Discover initiatives, workshops, experiences and community participation | Local opportunity, registration and community flows; no public multi-user service |
| Notifications, profile and account | Next steps, operational notices, profile settings and workspace entry | In-app/browser-local notices and demo identities; no real email, OTP or server authentication |

![Four DeepSprout Meaningful Practices and their distinct evidence](docs/assets/readme/meaningful-practices.svg)

## The Recovery Journey

**Account creation → Meet Bimo → Personal setup → Four baseline assessments → Starting Point → Plan preview → Activation → Weekly actions and reviews → Insights → Continued cycles.** The baseline set is Digital Habits, Sustained Attention, Inhibitory Control, and Depth Challenge. It establishes an initial comparison context; it is not a diagnosis.

![Diagram of first-run steps and the nested weekly Recovery Cycle](docs/assets/readme/recovery-cycle.svg)

A **Journey** is the person's continuing history. A **Recovery Cycle** is one bounded planning interval within it, normally four weeks in the present demo. A **week** contains scheduled actions, rest or routine context, and a review. A **Meaningful Practice** is an activity attempt with its own content and evidence; a scheduled action only points to it. **Lab assessments** are separate formal check-ins, including a weekly eligibility window in the current demo. The weekly review can accept a suggested next week, keep pace, or explicitly adjust future work. A cycle ending leads to review and a deliberate next-cycle or maintenance choice; elapsed days are not a recovery score. Details: [master §§4–5](DeepSprout.md#4-individual-onboarding-bimo-personal-setup-assessments-and-activation) and [Round 2C](docs/implementation/deepsprout-round2c-adaptive-recovery-report.md).

## Meet Bimo

<p align="center"><img src="src/DeepSprout.Web/wwwroot/assets/hero-v2/bimo-awake.png" alt="Original approved Bimo character, a small ivory and sage companion with a leaf sprout" width="230"></p>

Bimo is DeepSprout's **original approved companion**. Bimo welcomes people, guides the first-run sequence, and explains selected milestones in a calm, friendly voice. The image above is an existing runtime asset; source references and poses live in [`docs/references/bimo/`](docs/references/bimo/). Bimo is a guide in the interface, not a claim that a conversational AI service is running.

## Garden and evidence

![Illustrative diagram of four practice trees growing from qualifying evidence](docs/assets/readme/garden-growth.svg)

The Garden makes earned participation visible. Valid, eligible original practice attempts contribute to their corresponding four practice-type trees; routine and verified participation can produce bounded details under different rules. It does not grow merely because an app was opened, a timer elapsed, or a booking was made. Missing observations should remain unknown rather than be treated as failure. The illustration explains the current source model; it is **not a screenshot** of the Garden. See [the live Garden](http://127.0.0.1:8765/src/pages/member/garden/garden.html). The later design guidance calls for one clean ivory scene with one main plant; the current four-tree implementation remains until a separately scoped Garden task resolves its visual and evidence mapping.

## Connected workspaces

![Diagram of DeepSprout's Individual, partner, Supervisor and Admin workspaces](docs/assets/readme/workspaces-diagram.svg)

| Workspace | Primary pages and job | Connection |
| --- | --- | --- |
| **Individual** | [Home](http://127.0.0.1:8765/), [Recovery Plan](http://127.0.0.1:8765/src/pages/member/recovery-plan/recovery-plan.html), [Activities](http://127.0.0.1:8765/src/pages/member/training/training.html), [Lab](http://127.0.0.1:8765/src/pages/member/lab/lab.html), [Shield](http://127.0.0.1:8765/src/pages/member/shield/shield.html), [Garden](http://127.0.0.1:8765/src/pages/member/garden/garden.html), [Insights](http://127.0.0.1:8765/src/pages/member/insights/insights.html), [Explore](http://127.0.0.1:8765/src/pages/member/explore/explore.html) | Receives its own assignments, applications, bookings and attributed outcomes |
| **Coach / Mentor** | [Dashboard, Programs, Groups, Assignments, Reviews, Group Garden, Reports](http://127.0.0.1:8765/workspaces.html#/mentor/dashboard) | Runs an independent Program or reviews scoped group work |
| **Invited Student** | [Dashboard, My Tasks, My Group, Progress, Group Garden](http://127.0.0.1:8765/workspaces.html#/student/dashboard) | Joins a group through invitation; can later upgrade the same person identity to Individual |
| **Institution Representative** | [Dashboard, Initiatives, Applications, Team, Sessions, Forms, Reports](http://127.0.0.1:8765/workspaces.html#/organization/dashboard) | Publishes and runs youth initiatives, assigns staff, reviews participation and received Supervisor reports |
| **Outdoor Provider** | [Overview, Experiences, Registrations, Waiting List, Evaluations, Reports](http://127.0.0.1:8765/workspaces.html#/provider/overview) | Owns experiences and camps, bookings, offers, completion rules |
| **Supervisor** | [Dashboard, Schedule, Attendance, Excuses, Reports](http://127.0.0.1:8765/workspaces.html#/supervisor/dashboard) | Acts only on assigned Institution or Provider resources; confirms operational evidence |
| **Platform Admin** | [Overview, approvals, catalog, policy, CMS, moderation, reports, audit](http://127.0.0.1:8765/workspaces.html#/admin/overview) | Governs publication and platform policy; [legacy Admin](http://127.0.0.1:8765/admin.html#/dashboard) still holds some separate demo capabilities |

A person can have multiple **role grants**, each scoped to the relevant resource. A workspace switch does not grant permission. **Subscription entitlements** are a separate proposed commercial mechanism, not a substitute for identity or authorization; no real billing runs here. The current browser guards demonstrate policy, but production enforcement requires server-side checks. See [master §§2, 20, 23](DeepSprout.md#2-fundamental-concepts-authorization-and-workspaces).

## Operational workflows

![Three connected Institution, Coach and Outdoor Provider operational cycles](docs/assets/readme/operational-workflows.svg)

- **Individual recovery:** baseline → plan → practice and routine → weekly review → Insights and earned Garden growth → next decision. Evidence stays tied to its original person, attempt and cycle.
- **Independent Coach Program:** Admin approves a Coach; the Coach publishes an invite-only Program and owns groups; an invited Student submits assigned work; Coach review, reports and a Group Garden reflect eligible outcomes. Upgrade keeps the same person identity and history. [Implementation report](docs/implementation/independent-coach-cycle-implementation-report.md).
- **Institution Initiative:** an approved Representative publishes an Initiative into regular Explore; an Individual applies; admission, groups, Coach tasks, sessions, forms and reports refer to shared records. The Representative's current Reports route is a received Supervisor-report inbox with attached Coach reports. Supervisor check-in and excuse decisions remain separate from registration. [Institution report](docs/implementation/institution-cycle-implementation-report.md) · [Supervisor report](docs/implementation/supervisor-cycle-implementation-report.md).
- **Outdoor experience:** a Provider publishes a versioned experience or camp; an Individual books or joins a waiting list. Offers have expiry and capacity rules; an assigned Supervisor verifies attendance; completion follows the published criteria, then reports and eligible Garden effects read the original record. [Provider report](docs/implementation/deepsprout-round1-outdoor-provider-report.md).
- **Admin governance:** application approval, publication, policy, moderation and audit views span these flows. The two Admin demos still require measured consolidation before production.

These flows share person, resource and participation identities in the newer browser-local demo. A registration is not attendance; attendance is not completion; a self-report is not a system-scored result. Current cross-workspace status and unresolved seams are tracked in the [cycle audits](docs/cycles/README.md) and [implementation reports](docs/README.md).

## Pages and navigation

| Area | Public entry points | Destination routes |
| --- | --- | --- |
| Public and access | [Home](http://127.0.0.1:8765/), [former story landing](http://127.0.0.1:8765/landing.html), [Pricing](http://127.0.0.1:8765/pricing.html), [Register](http://127.0.0.1:8765/register.html), [Login](http://127.0.0.1:8765/login.html), [Partner entry](http://127.0.0.1:8765/partners.html) | Public pages and auth pages under [`Client/src/pages/`](Client/src/pages/) |
| Individual first run | [Onboarding](http://127.0.0.1:8765/onboarding.html), [Lab](http://127.0.0.1:8765/lab.html) | Bimo/setup/Starting Point and four Lab tasks |
| Individual ongoing | [Recovery Plan](http://127.0.0.1:8765/recovery-plan.html), [Weekly Review](http://127.0.0.1:8765/weekly-review.html), [Activities](http://127.0.0.1:8765/training.html), [Shield](http://127.0.0.1:8765/shield.html), [Garden](http://127.0.0.1:8765/garden.html), [Insights](http://127.0.0.1:8765/insights.html), [Explore](http://127.0.0.1:8765/explore.html), [Community](http://127.0.0.1:8765/community.html), [Profile](http://127.0.0.1:8765/profile.html) | Most short `Client/*.html` URLs forward to corresponding `Client/src/pages/member/...` pages |
| Partner and administration | [Partner workspaces](http://127.0.0.1:8765/workspaces.html#/auth/login), [legacy Admin](http://127.0.0.1:8765/admin.html#/dashboard) | Hash routes such as `#/mentor/dashboard`, `#/organization/initiatives`, `#/provider/waitlist`, `#/supervisor/attendance`, `#/admin/overview` |

The workspace [navigation source](src/DeepSprout.Web/wwwroot/src/workspaces/navigation.js) is the exact current menu inventory. The [current product guide](docs/current-product-guide.md) describes every destination and cycle; the [client guide](docs/client-static-site-README.md) records local preview and experiment entry points.

## Architecture and technology

![Current static demo architecture compared with the proposed production stack](docs/assets/readme/architecture.svg)

| Layer | Running in this repository | Planned production direction |
| --- | --- | --- |
| Web experience | 46 Razor views and MVC routing in `src/DeepSprout.Web`; CSS, JavaScript and images under `wwwroot/`, and the hash-routed `workspaces.html` partner workspaces | Server-backed MVC actions; the older Angular client direction needs a separate integration decision |
| State | Browser-local person journals, ecosystem graph, seeded JSON and some separate legacy Admin data; separate EF Core/SQL Server schema and validation solution | ASP.NET Core MVC application with C# domain services and EF Core/SQL Server persistence |
| Identity and access | Demo identity selector and browser-side scoped guards | Authenticated identity, role and resource-scoped server authorization |
| Business changes | Local commands and projections; some original records bridge Individual and partner screens | Versioned workflows, transactions, service-layer invariants and durable audit trails |
| Browser protection | Optional Chrome extension with local-origin pairing and restricted site coverage | Technically validated extension and authenticated, consent-aware sync |
| Hosting | One ASP.NET Core MVC application run locally; validation database is separate | Hosted ASP.NET Core MVC application, database and optional extension distribution |

DeepSprout is **one ASP.NET Core MVC solution**. The pages are Razor views in `src/DeepSprout.Web/Views`; their CSS, JavaScript, images and fonts live in `src/DeepSprout.Web/wwwroot`. Page URLs keep their historical `.html` form (for example `/training.html`), routed by `PagesController` from `page-routes.json`. There is no separate static HTML site.

## Repository structure

```text
.
├── DeepSprout.sln                 # Open this in Visual Studio
├── DeepSprout.Database.slnx       # Database-focused solution
├── src/
│   ├── DeepSprout.Web/            # ASP.NET Core MVC website
│   │   ├── Controllers/           # PagesController (page routing)
│   │   ├── Models/                # PageCatalog (routes from page-routes.json)
│   │   ├── Views/                 # 46 Razor views grouped by area
│   │   ├── wwwroot/               # assets/ (media, Bimo, vendor) and src/ (page JS/CSS, workspaces)
│   │   ├── Program.cs  page-routes.json  appsettings.json
│   ├── DeepSprout.Domain/         # Domain records (no persistence dependency)
│   ├── DeepSprout.Application/    # Command contracts and DTOs
│   └── DeepSprout.Infrastructure/ # EF Core SQL Server context, migrations
├── tests/
│   ├── mvc-smoke.mjs              # Routes every page and resolves every local link/asset
│   ├── client/                    # Browser-model and Playwright suites (run against the MVC site)
│   └── DeepSprout.DatabaseValidation/  # SQL Server integration suite
├── extensions/digital-shield/     # Optional Chrome extension (not part of the website)
├── docs/                          # Product guide, database architecture (v4, v5), design/validation records
│   ├── architecture/database/     # Database design, v5 lean design and SQL submission
│   ├── client/                    # Former client architecture, design and validation records
│   └── references/                # Approved Bimo and design references
├── tools/                         # Database and media helper scripts
├── experiments/                   # Independent Bimo/visual experiments
├── DeepSprout.md  DESIGN.md  DeepSprout-DESIGN.md  AGENTS.md
```

## Run locally

Open [`DeepSprout.sln`](DeepSprout.sln) in Visual Studio, set `DeepSprout.Web` as the startup project and press F5. From a terminal with .NET SDK 10:

```sh
dotnet run --project src/DeepSprout.Web/DeepSprout.Web.csproj
```

Open `http://127.0.0.1:8765/`. Partner workspaces are at `/workspaces.html#/auth/login`. The demo stores records in the **browser origin**, so a different port or host starts with empty local data. A database connection is optional (`ConnectionStrings__DeepSprout`); running the site never migrates or writes to the validation database. Before adding server sessions, configure a persistent protected key store through `DataProtection__KeyDirectory`.

Publish with `dotnet publish src/DeepSprout.Web/DeepSprout.Web.csproj -c Release`.


## Status and roadmap

The spec's [§29 snapshot](DeepSprout.md#29-current-implementation-versus-agreed-target-15-october-2026) is dated 15 October and predates substantial client and database work. Use the [current product guide](docs/current-product-guide.md) and milestone evidence for this working tree.

| Status | Scope |
| --- | --- |
| **Implemented in the local demo** | Static public/member pages; Bimo onboarding; four baseline task interfaces and local activation; four practice players; local Recovery cycles and reviews; institution/Coach/Student/Supervisor/Provider records and example flows; received Institution report inbox; community interactions; root Pages-ready homepage |
| **Partial or simulated** | Local identity, permissions, QR/code checks, notices, demo capacity and clocks, payment acknowledgements, Admin split, source coverage and some cross-workspace edge cases. Extension pairing/enforcement is restricted to supported local Chrome conditions |
| **Next validation and product work** | Re-run cross-workspace acceptance after active changes; consolidate Admin by capability; settle Garden direction and thresholds; test additional accessibility, responsive and error states; validate extension distribution and consent policy |
| **Implemented MVC presentation and database foundation** | 46 routed Razor views, existing static assets, EF Core SQL Server schema, migrations, domain/application code and integration validation in `Server/`; product records remain browser-local |
| **Planned production engineering** | Server-backed MVC commands with EF Core/SQL Server persistence, real authentication and resource authorization, transactional capacity, durable audits, secure notifications, deployment/operations and threat review; any Angular client work is a separate target described in the specification |

For precise evidence and remaining limitations see the [Round 0](docs/implementation/deepsprout-round0-stabilization-report.md), [Provider](docs/implementation/deepsprout-round1-outdoor-provider-report.md), [Round 2A](docs/implementation/deepsprout-round2a-individual-onboarding-lab-report.md), [Round 2B](docs/implementation/deepsprout-round2b-meaningful-practices-report.md), and [Round 2C](docs/implementation/deepsprout-round2c-adaptive-recovery-report.md) reports. Earlier [cycle audits](docs/cycles/README.md) remain useful for route inventories and historical gaps.

## Testing, accessibility and privacy

With the site running (`dotnet run --project src/DeepSprout.Web`), the checks are:

```sh
node tests/mvc-smoke.mjs                      # every routed page, custom 404, every local link and asset
node --test tests/client/partner-store.test.mjs tests/client/institution-cycle.test.mjs tests/client/supervisor-cycle.test.mjs tests/client/coach-cycle.test.mjs
node --test tests/client/round2a-personal.test.mjs tests/client/round2b-practices.test.mjs tests/client/round2c-recovery.test.mjs tests/client/round2d-shield.test.mjs
BASE_URL=http://127.0.0.1:8765 node tests/client/round0-browser.test.cjs   # Playwright suites; set CHROME_PATH
```

Browser suites in `tests/client/` need Playwright and Chrome (`CHROME_PATH`). The [former client guide](docs/client-static-site-README.md) lists the relevant `BASE_URL`, `CHROME_PATH` and `NODE_PATH` settings. Some existing browser tests write screenshots under validation folders; choose a temporary `SHOTS_DIR` when supported and inspect the test before running it. The root `package.json` has a placeholder `npm test` command, so use the actual test commands above.

During the 3 November documentation review, page wiring passed for 14 pages. The combined Institution, Supervisor, Coach and Provider domain run passed 37 of 41 cases; four Institution/Supervisor cases stopped at the newly required “remote or on-site” session-booking value in their test fixture. See the [current guide](docs/current-product-guide.md#current-implementation-and-evidence-limits) for the verification boundary.

Responsive layouts, keyboard controls and reduced-motion states have targeted implementation evidence, but no complete assistive-technology audit is claimed. Avoid using the demo for sensitive personal information: browser-local records are not a production privacy or security boundary. Insights should distinguish system-scored, self-reported, browser-observed and Supervisor-confirmed sources; missing evidence should remain unknown. The [master safety and accessibility section](DeepSprout.md#24-safety-accessibility-privacy-measurement-and-operational-quality) defines the intended safeguards.

## Contributing and license

Start with [`DeepSprout.md`](DeepSprout.md), then read [`AGENTS.md`](AGENTS.md), [`DESIGN.md`](DESIGN.md) and the relevant [cycle report](docs/cycles/README.md). Keep changes scoped, add evidence for a changed cross-workspace effect, preserve Bimo's approved artwork, and document whether a feature is local demonstration or production behavior. For homepage changes, regenerate the root entry; for diagram changes, run `python3 scripts/build_readme_diagrams.py`. Open an issue or pull request with the affected route, expected behavior and test result.

No repository-level `LICENSE` file is present. The root `package.json` contains an `ISC` metadata field, but that alone is not presented here as a verified license for all source and artwork. Ask the repository owner before reusing or redistributing assets outside the project.
