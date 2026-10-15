# Admin / member information architecture and integration audit

> **Historical implementation report.** This file records behavior and verification at its original milestone. The [authoritative DeepSprout v4.0 specification](../../../DeepSprout.md) governs the approved target; see [§29](../../../DeepSprout.md#29-current-implementation-versus-agreed-target-15-october-2026) for the current-versus-target boundary.

Updated 15 October 2026. This is a static frontend; `Server/` has no backend. Existing working-tree member changes were retained.

## Implemented

- Dashboard hierarchy: platform overview → four summary metrics → review queue and actions → participation/account status → completion distribution and audit activity. Wider gaps and taller panels replace the previous compressed five-card / three-column layout. Decorative foliage, metric icons and repeated/unavailable growth rates were removed.
- Admin tables use 15px body text and 14px headings/secondary text, with larger controls and row spacing. Main descriptive text and inputs use 16px. Small-screen text stays readable. Wide tables scroll in a keyboard-focusable, labelled region.
- Activities now has six columns. Description, goals, duration, mode, eligibility and status remain available at a glance; evidence and completion requirements live in the preview/editor. The member guide now includes those missing details and the optional image/alt text.
- Reports & Analytics was removed. Subscriptions & Revenue replaces it; legacy `#/reports` resolves to the new screen. Platform analytics remain on Dashboard.
- Pricing and Admin share `src/js/config/subscriptions.js`: Free, Plus Monthly ($3.99), Plus Annual ($29.99). Admin has subscription/payment tables and explicit empty states. The profile links to Pricing and identifies the Free preview.
- Revenue starts empty. MRR uses active, unexpired paid USD contracts at their recorded price, dividing annual amounts by 12. Collections/refunds cover successful USD payments collected during the current calendar month. Payment history preserves currency. No checkout, card collection or invented financial records was added.
- Users shows the actual current member account using `DeepSproutAccount`, separately from the ten administration samples. Profile changes, goal, baseline task coverage, active cycle and routine count are visible; changes from another tab refresh the preview.
- Community is accessible from navigation. Member reports and member-created posts appear in Admin; hiding reported content changes the member feed, including another open tab. Dismissal leaves post visibility unchanged. Pending reports also appear in Dashboard notifications/attention.
- Groups, Garden rule previews, Audit and the partner-admin workspace have explicit links from Settings; Recovery Plans links to its related Garden rules and member roadmap.

## Page-by-page findings

| Member area | Admin counterpart / actual connection | Finding / remaining boundary |
| --- | --- | --- |
| Home / dashboard | Dashboard, Users | Member figures come from the shared account model. Dashboard totals come from administration samples, with explicit scope text; they are not platform-wide live telemetry. |
| Login / Register | Demo entry, Users | Authentication/registration services do not exist. No password or authentication capability was added. |
| Onboarding | Users member preview | Goal/setup and profile are stored with the member account; the preview reflects the current account. No platform-wide user directory or admin editing of setup answers exists. |
| Starting point | Recovery Plans | Activates the member's deterministic plan. Admin templates configure the separate simulator; the page now explains this and links to the member roadmap. |
| Check-in hub / assessment task | Assessments | Admin library questions, durations and versions are separate from executable instrument definitions and account catalogue metadata. The UI now explicitly calls these drafts and explains that edits do not publish to member tasks. A production content publisher needs instrument IDs, validated task schemas, effective versions and migration rules; arbitrary admin questions must not silently change scored tasks. |
| Roadmap | Recovery Plans, Users | Member schedule, progress and cycle come from the account model. Preview is visible in Users. Sample admin plan rows do not modify the member schedule. |
| Activities | Activities | Publish/archive affects member guide visibility. Missing evidence/completion/goal/image fields were added to guides. Built-in timed practices remain the account's scored activity types; custom guides are labelled read-only and do not claim completion or plan participation. |
| Offline routine | Users member preview | Member check-ins feed the account's routine/history/Garden/Insights. Administrative activity flags are not evidence for these check-ins. |
| Weekly Review | Member roadmap / account | Review events and adjustments stay in the member account. Admin has no review response editor or personal-answer access. |
| Digital Shield | Digital Shield | Admin categories/presets are suggestions, separate from member preferences and sample usage history. Existing page text states this. No real extension connection or blocking exists. |
| Garden | Garden rule previews | Member growth derives from account participation policy. Admin sample rules do not drive this policy; these remain explicitly previews. Production needs one versioned policy source and evidence contracts. |
| Insights | Dashboard | Personal progress uses the same member account as Roadmap/Activities/Garden. Platform metrics have a different scope. Removed the extra admin analytics screen that repeated the dashboard. |
| Explore / registrations | Partner administration (`workspaces.html`) | Member Explore uses `listings.json` plus account registrations. Partner workspaces use a separate ecosystem store. Publication, capacity, registration and attendance are not synchronised between those two models. A link to partner administration makes that workspace discoverable; integration still requires shared resource/person/registration IDs and a single persistence service. |
| Community | Community / moderation queue | Repaired member report → admin review → member visibility. Likes, saved posts and comments remain local interactions; comments are visit-only. The sample Admin Joint Goals are not the member-created challenge model. |
| Profile | Users | Name/email changes are visible in the Admin member preview, including across tabs. Local preferences and reset retain their existing scope. |
| Pricing / subscription | Subscriptions & Revenue, Profile | Shares the plan catalogue; exposes the missing subscription location in Profile. Checkout, entitlements and payment-provider reconciliation remain unimplemented. No upgrade button creates a paid entitlement. |
| Content Studio | Former animated Landing | Publishes four approved regions of `landing.html`. It does not edit the newer `index.html` Home. Studio already labels the target as Landing Page and its published-page action opens that page. Extending CMS coverage requires explicit Home content keys. |
| Settings / Audit / Groups | Administration tools | Sample settings/status changes and audit events persist in the administration store. They are not server permissions. The previously hidden destinations are reachable from Settings. |

## Fields needed for full integration

The major remaining gaps are data contracts, not extra dashboard cards: stable member IDs across stores; published instrument IDs and versions; per-user completion events with source/evidence/time; shared plan/policy versions; shared opportunity/registration/attendance IDs; subscription ownership, effective dates and entitlements; payment-provider transaction IDs/currency/refund timestamps; and server-enforced permissions. These require a shared backend/domain model to replace the current independent demonstrations.

## Verification

- `page-wiring.test.cjs`: 14 member pages passed.
- `admin-dashboard.test.cjs`: date boundaries, metric calculations, period controls, route compatibility, editors, navigation, notifications, empty states and 320/390/768/1024px overflow checks passed.
- `admin-member-integration.test.cjs`: MRR/currency/status/date/refund boundaries; empty and populated finance screens; shared Pricing; profile-to-Admin (including cross-tab refresh); activity publish/archive and missing fields; community report/moderate/hide; all 13 Admin routes at 1440/768/390/320px; all 13 member destinations at desktop/mobile; no JavaScript exceptions or failed local assets.
- Desktop Dashboard, Users and Subscriptions, and mobile Dashboard screenshots reviewed visually.
- `member-journey.test.cjs` was skipped by its existing runner because `jsdom` is not installed. Browser integration checks above executed normally.
