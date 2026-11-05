> Superseded by [the Admin/member IA audit](admin-member-ia-audit.md) for the current layout, typography, subscription screen and integration findings. The report below records the earlier implementation.

> **Historical implementation report.** This file records behavior and verification at its original milestone. The [authoritative DeepSprout v4.0 specification](../../../DeepSprout.md) governs the approved target; see [§29](../../../DeepSprout.md#29-current-implementation-versus-agreed-target-15-october-2026) for the current-versus-target boundary.

# Admin dashboard redesign

Implemented in the existing static JavaScript Admin application (`admin.html#/dashboard`). This repository has no Angular workspace, package scripts, ASP.NET application, or backend API to preserve or build. The demo-only entry guard, local store, hash routes, existing logo, editors, publishing workflows, and logout remain in place. No dependencies, database changes, or external services were added. Existing member-page changes in the working tree were left untouched.

## Files and reuse

- `src/admin/app.js`: simplified navigation, working persistent icon rail, responsive drawer with focus management, notification and profile popovers. Groups, Garden Rules, Community and Audit routes still resolve directly.
- `src/admin/admin.css`: Admin shell and dashboard styling, botanical decoration, responsive grids and outline icons.
- `src/admin/core.js`: removes the old eight-card dashboard; preserves Users, Groups and Activities management.
- `src/admin/dashboard.js`: dedicated dashboard presentation and derived metrics; exports metric calculations for verification.
- `src/admin/icons.js`: reusable inline SVG outline icons, without a library dependency.
- `tests/admin-dashboard.test.cjs`: browser integration and data-integrity checks.
- `docs/architecture/admin-dashboard-redesign.md`: implementation report and metric definitions.
- `docs/validation/admin/dashboard-redesign/desktop.png` and `mobile.png`: final visual verification screenshots.

Reuses `store.js`, `ui.js` escaping/formatting/table/dialog helpers, `core.js` activity creation, `operations.js` management screens, and `platform.js` content/reports/settings/audit. The dashboard is synchronous because the existing data source is local. API loading, network errors and retry behavior will belong to a future service integration; no artificial loading state was added.

## Data definitions

Every number derives from the existing, explicitly configured browser demo store. **None uses backend data**, because no backend exists. No reference-image sample numbers or new fictional analytics were introduced.

| Display | Calculation and scope |
| --- | --- |
| Total users | Number of stored user accounts, current snapshot |
| Active users | Accounts whose `status` is `active`; this is administrative account status, not recent login activity |
| Activity completions | Sum of stored `activityCompletions.count` aggregates in the chosen period for Meaningful Practice, Digital Protection & Habit Control, and Offline Life. These represent demo completions, not attempts; production verification is unavailable |
| Active recovery plans | Plan records whose `status` is `active`, current snapshot |
| Completed assessments | Sum of `assessments.completions`, all time; records have no completion timestamps |
| Registrations | Stored `users.joined` dates, filtered to the selected period, grouped by month **and year** with zero-filled months and a zero baseline |
| Account status donut | Each distinct account status across all current accounts; category counts sum to Total Users |
| Completion bars | The same three disjoint activity families as the completion KPI, with a shared scale from zero to the largest category total. Depth Reading remains within Meaningful Practice; legacy Stillness/Community categories are excluded rather than reintroduced |
| Account activation rate | Active-status accounts / all accounts |
| Assessment completion rate | Accounts with `assessment === 'Complete'` / accounts with an assessment status other than `—`. This is a user-level rate, not assessment-total / users |

Zero denominators show Unavailable. Missing subscription data is replaced by the account-status donut. Historical growth comparisons, plan continuation, and user-level activity engagement remain unavailable. No percentages were inferred from the reference.

The range defaults to Last 30 days; it filters registration dates, supported activity completion aggregates and recent activity, including the current day. All time remains capped at today so future records are not counted. Snapshot cards, undated assessment totals and bottom rates explicitly retain their own scopes.

Needs Attention and bell notifications derive only from activity drafts and unpublished content changes. The badge counts unseen queue notifications, not the number of reports or users; notification acknowledgement is browser-local. Queue contents disappear as drafts are published. An empty queue has a positive empty state. Recent Activity combines relevant dated audit events, registrations and plan starts, sorts by stored timestamps and excludes partner/community events. Date-only records show their stored date, without fabricated times. Quick actions route to existing destinations; Add New Activity opens the existing editor.

## Future backend needs

No desired navigation destination is missing. Production needs the originally planned authenticated ASP.NET services, account activity timestamps, individual successful completion records linked to users/categories, dated assessment completions, subscription records if subscription reporting is desired, longitudinal plan status history, and trustworthy administrative event/notification records. No hypothetical API URLs were introduced.

## Verification

- JavaScript syntax checks: `app.js`, `core.js`, `dashboard.js`, `icons.js` passed.
- `node Client/tests/page-wiring.test.cjs`: 14 pages passed.
- `tests/admin-dashboard.test.cjs`: passed in headless Chrome. Checks five KPIs, nine navigation links, metric totals, date/year boundaries, range changes, rail expansion and persistence, notifications/profile menus, 12 existing routes, activity creation dialog, drawer/inert behavior, Escape dismissal, and empty data.
- Responsive overflow checks passed at 1024, 768, 390 and 320 pixels; desktop visual review at 1536 pixels. Desktop/mobile screenshots were compared against the supplied reference and spacing refined.
- No page exceptions or failing local asset requests in the browser suite.
- `git diff --check` passed for modified Admin files.
- Angular build/type-check: not applicable; this checkout has no Angular project or build configuration.

Run the browser test with `PLAYWRIGHT_MODULE` pointing to an installed Playwright package, Chrome available, and the local server running at `http://127.0.0.1:8765` (override `BASE_URL` and `CHROME_PATH` if needed).
