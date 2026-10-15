# Non-Individual workspace implementation

> **Historical implementation report.** This file records behavior and verification at its original milestone. The [authoritative DeepSprout v4.0 specification](../../../DeepSprout.md) governs the approved target; see [§29](../../../DeepSprout.md#29-current-implementation-versus-agreed-target-15-october-2026) for the current-versus-target boundary.

## Collaboration boundary

Claude Code owns the Regular/Individual cycle. This implementation adds `workspaces.html`, `partners.html`, `join.html`, `src/workspaces/`, and its own tests. Existing member, public, auth, admin, and shared styling files are left unchanged. Its only persisted key is `deepsprout-ecosystem-demo-v1`; resetting it never clears Individual or existing Admin data.

The actual checkout is a static ES-module frontend, as documented in `Client/README.md`. There is no Angular dependency, CLI, or build configuration. Preserve this architecture while another agent works here. Hash routes follow the existing Admin convention and need no server rewrites. The later owner-approved target retains an Angular port after the Phase-1 static demonstration; this paragraph describes the original implementation boundary.

## Progress

- [x] Read product specification and supplied implementation brief; audit current frontend and artwork.
- [x] Central connected store, domain commands, scoped identities, shell and demo scenarios.
- [x] Partner account, applications, status, invitations, verification and workspace selection.
- [x] Mentor groups, programs, assignments, reviews, reports and Garden.
- [x] Limited Student task/submission/progress/account cycle.
- [x] Institution six-stage initiative builder, sessions, forms, competitions, team and partnerships.
- [x] Provider six-stage experience builder, capacity, offers, appointments, attendance and reports.
- [x] Supervisor appointments, cohorts, sessions, evaluations, Garden and closing report.
- [x] Participant discovery, independent component registrations, booking and form responses.
- [x] Admin applications, oversight, constrained CMS, moderation, audit and configuration.
- [x] Desktop/mobile, accessibility, connected walkthroughs and regression verification.

## Run

Serve `Client/` using the existing static server convention. Open `partners.html` for registration or `workspaces.html#/auth/login` for the locally provisioned demo identities. Demo controls are enabled only on localhost, loopback or `file:`. The local app itself is an explicitly labeled simulation; it provides no real authentication or permissions.

ES modules should be served over HTTP for reliable browser operation. Example:

```sh
cd Client
python3 -m http.server 8786 --bind 127.0.0.1
```

Open `http://127.0.0.1:8786/partners.html`. Maya has Mentor and Institution memberships; Sami has Provider and assigned Supervisor memberships; Noor has limited Student access; Leen is the provisioned Admin. All verified sample people can use the partner participation view. Dana is available in the pending-application scenario. No public Admin or Supervisor signup exists.

## Architecture

- `app.js` lazily imports the current feature module and owns the route shell, responsive navigation, workspace switching and development controls.
- `store.js` provides `read`, `dispatch`, scoped workspace resolution, invitation state resolution and persistence. Changes are applied to a cloned state and persisted only after validation succeeds.
- `data/` separates mentorship, institutional, outdoor and platform seed records with stable relationships. `models.d.ts` and JSDoc document typed domain contracts without installing a second framework.
- `commands/` separates explicit domain transitions from rendering. Local capacity includes seats held by active offers; expiration advances the queue. Invitations, reviews, appointments, attendance and source rewards have local guard checks.
- `builders/` provides focused program, initiative, experience and versioned form builders with draft recovery, validation and preview.
- `pages/` contains independent role renderers and interaction handlers. `shared.js` provides only genuinely shared account, source-qualified reporting, Garden and field-operation interfaces.
- `ui.js` contains escaped text rendering, SVG icons, accessible fields, native modal dialogs, toasts, search/status filters and CSV export.
- `workspaces.css` is loaded only by the new entry. Existing theme tokens, approved photographs, local fonts and Bimo assets are reused read-only.

## Route inventory

All paths below follow `workspaces.html#/`. Hash routing is the existing static-client convention; it does not require server rewrites.

| Area | Screens and resource routes |
| --- | --- |
| Entry | `auth/register`, `auth/register/partner`, `auth/account/:type`, `auth/verify/:type`, `auth/application/:type`, application review via `?review=true`, `auth/application-status/:id`, `auth/institution-invitation`, `auth/login`, `auth/workspaces`, `auth/help` |
| Invitations | `join/:token`, verification via `?step=verify`; `join.html?token=...` redirects to the same invitation |
| Mentor | `mentor/dashboard`, `groups`, `groups/:id` with Overview/Members/Invitations/Programs/Activity/Settings tabs, `students`, `students/:id`, `programs`, `programs/new`, `programs/:id`, `programs/:id/edit`, `assignments`, `reviews`, `reviews/:id`, `group-garden`, `reports`, `notifications`, `profile`, `account` |
| Student | `student/dashboard`, `tasks`, `tasks/:id`, `group`, `garden`, `progress`, `account`, `protected-work/:assignmentId` only for an assigned Protected Work task |
| Institution | `organization/dashboard`, `initiatives`, `initiatives/new`, `initiatives/:id`, `initiatives/:id/edit`, `sessions` with list/calendar toggle, `sessions/:id`, `forms`, `forms/new`, `forms/:id`, `forms/:id/edit`, `forms/:id/responses`, `competitions`, `competitions/:id`, `team`, `partners`, `participants`, `reports`, `settings`, `account` |
| Provider | `provider/overview`, `experiences`, `experiences/new`, `experiences/:id`, `experiences/:id/edit`, `calendar`, `registrations`, `waitlist`, `supervisors`, `partnerships`, `attendance`, `evaluations`, `reports`, `profile`, `account` |
| Supervisor | `supervisor/dashboard` including appointment acceptance, `experiences`, `experiences/:id`, `cohorts`, `cohorts/:id`, `participants`, `schedule`, `attendance`, `evaluations`, `group-garden`, `reports` with closing-summary submission, `account` |
| Participant | `participant/discover`, `initiatives`, `initiatives/:id`, `sessions/:id`, `forms/:id`, `competitions/:id`, `experiences/:id`, `bookings/:id`, `registrations`, `programs/:id`, `cohorts/:token`, `account` |
| Admin | `admin/overview`, `users`, `mentor-applications`, `mentor-applications/:id`, `organizations`, `organizations/:id`, `providers`, `providers/:id`, `programs`, `initiatives`, `experiences`, `activity-catalog`, `assessments`, `policies`, `cms`, `moderation`, `reports`, `audit`, `system`, `entitlements`, `account` |

Reports use `?resource=...` and date-range parameters. Mentor reports also filter by program, and Supervisor reports by cohort. Attendance uses `?resource=...&session=...`. Resource ownership and membership are checked before a record is rendered. Unknown or unavailable records have meaningful fallback screens.

## Connected interactions verified

1. Mentor creates a group and invitation; Student uses the demonstrated OTP, joins, submits, receives revision feedback, resubmits and sees approval. Exactly one source-linked Garden contribution is created.
2. Program builder completes all five stages, publishes a version and generates assignments for the selected groups.
3. Institution builder completes exactly six stages, publishes an initiative; form builder publishes a version; anonymous responses appear as anonymous in the institution aggregate viewer.
4. Provider builder completes exactly six stages and publishes a camp with multiple sessions, capacity, safety, consent and completion criteria.
5. Cancelling a confirmed booking issues a held offer to the next waiting participant. Acceptance, decline, expiry and repeated acceptance preserve the local capacity invariant.
6. Provider accepts and links an independent experience to an Institution partnership. The initiative displays the link and keeps reports aggregate-only.
7. Appointed Supervisor accepts, creates eligible cohorts, records session attendance, rejects duplicate credential entry, evaluates completion and submits a closing report visible to the Provider.
8. Admin requests more information, applicant responds, Admin approves and the new workspace becomes available. Newly approved entities get an empty resource scope instead of unrelated sample resources.
9. CMS edit mode uses pencils, allowlisted local images and controlled typography/color tokens. Preview, draft save, local publish, prior versions and rollback are interactive. Published partner content appears on partner discovery.
10. Each partner category completes actual account/verification/application/review screens. Incorrect OTP and all seven application-state scenarios were exercised. Existing-person reuse does not duplicate an identity or persist passwords.
11. Search/no-results feedback, report CSV download, native modal Escape handling, mobile navigation and reduced-motion Garden were checked.
12. Reset preserves the existing Individual and legacy Admin storage keys.

## Validation

```sh
node Client/tests/partner-store.test.mjs
NODE_PATH=/path/to/node_modules node Client/tests/partner-browser.test.cjs
NODE_PATH=/path/to/node_modules node Client/tests/partner-entry.test.cjs
node Client/tests/page-wiring.test.cjs
```

Browser tests use Playwright and an installed Chrome executable; set `BASE_URL`, `CHROME_PATH` or `PLAYWRIGHT_MODULE` when needed. They run with a fresh browser profile. No project dependency changes are required.

Validation reports and desktop/mobile screenshots live in `Client/docs/validation/partner-workspaces/`. `report.json` records 100 route states, seven browser walkthroughs, 390px/768px layout checks, CSV, native dialogs and reduced motion. `entry-report.json` records three complete partner-entry flows and isolation checks. Ten Node domain tests cover lifecycle errors, idempotency, capacity, ownership, versioning, anonymity and connected state. All 27 new JavaScript modules were parsed explicitly as ES modules. Existing page wiring also passed.

No Angular build or lint command was run: this checkout has neither Angular nor a configured build/lint toolchain. No backend services were added.

## Deliberately simulated behavior

Account access, email verification/OTP, organization verification, staff capabilities, notifications, invitations, booking inventory, offer deadlines, credential/QR check-in, attendance confirmations, judging, completion, Garden eligibility, reports, CMS publishing and audit entries are browser-local demonstrations. No email/SMS is sent, no file content is uploaded, no payment is processed, no extension runs, no API or AI provider is called, and no real authorization or concurrency guarantee is claimed. File controls preserve only names. Protected Work has a local start/pause/end timer and self-reported summary, without browser blocking or automatic approval.

Garden uses one central vector plant. A qualifying source creates a small illustrative bloom, never XP, a new world region or a health score. Repeat review/completion actions do not generate duplicate source memories.

## Integration with Claude's Individual cycle

The existing Register, Login, Individual Explore, navbar, shared storage and legacy Admin files were intentionally not edited while Claude owns them. New partner registration preserves the existing Individual signup URL, and Student upgrade opens the existing Individual onboarding while preserving partner identity/membership/submission records. Full identity sharing with the Individual store, shared navigation links, and a final Angular migration need a coordinated integration pass after the Regular cycle is stable. The new companion discovery view reads the partner dataset without changing Individual Explore state. This boundary prevents concurrent file edits and accidental personal-data resets.

For a later integration, link to `partners.html` or `workspaces.html#/auth/workspaces`, and read partner resources through the store service rather than duplicating sample data. Keep the two storage scopes separate until a unified identity migration is explicitly implemented.

## Open product decisions

Later owner approvals fixed **135 accepted students and three active Supervisors per Institution Initiative**, a **configurable 24-hour offer-expiry demo default**, weekly Lab eligibility, exactly four Personal practice trees, and Group Garden ownership. Vetting evidence, age/guardian policy, waitlist priority exceptions/delivery, exact reward thresholds, real prices and production permissions still need detail. All operational records here are fictional and local to this browser.

## Approved target after this historical implementation

The six-stage Institution Builder must publish to **regular Individual Explore**; a Representative or active Initiative Supervisor may approve the same Application once. Institution-invited Coach/Supervisor identities need no separate Admin approval. An Initiative may publish before Supervisor acceptance, but attendance stays disabled with `Needs Supervisor` until an active grant exists. In-person QR has typed/pasted or audited manual fallback; online uses roster verification. Student excuses are separate from factual attendance and Representative-decided. Institution structured mode remains an Initiative, and Groups parent either that Initiative or an independent Coach Program. The Provider queue needs its full lifecycle with the configurable 24-hour demo default and test clock. Surveys are **identified** in Phase 1, despite the earlier current-code anonymous path above. The Personal Garden has exactly four practice-type trees, and Group Gardens exist for one Initiative-wide scene or one independent Coach group, not a Provider cohort. See [master §§13–17](../../../DeepSprout.md#13-coach--mentor-program-and-shared-assignment-engine) and [§29](../../../DeepSprout.md#29-current-implementation-versus-agreed-target-15-october-2026).
